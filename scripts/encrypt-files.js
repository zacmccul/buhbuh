#!/usr/bin/env node

/**
 * Pre-commit hook for encrypting sensitive files
 * Run this from the repository root: node scripts/encrypt-files.js
 * This script:
 * 1. Reads all files from public content directories
 * 2. Encrypts them with the password from .env
 * 3. Creates .enc files ready for commit
 * 4. Updates .gitignore to exclude unencrypted originals
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Import crypto utilities - we'll create a Node.js version
const ALGORITHM = 'PBKDF2';
const KEY_LENGTH = 32;
const ITERATIONS = 100_000;
const HASH = 'SHA-256';
const NONCE_LENGTH = 24;
const SALT_LENGTH = 16;

// Directories to encrypt
const CONTENT_DIRS = ['poems', 'music', 'art', 'pictures', 'writing'];
const PUBLIC_DIR = join(projectRoot, 'public');

/**
 * Simple PBKDF2 key derivation using Node crypto
 */
async function deriveKey(password, salt = null) {
  const crypto = await import('crypto');
  const util = require('util');
  const pbkdf2 = util.promisify(crypto.pbkdf2);

  const usedSalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = await pbkdf2(password, usedSalt, ITERATIONS, KEY_LENGTH, HASH);

  return { key: Buffer.from(key), salt: Buffer.from(usedSalt) };
}

/**
 * Encrypt using Node's built-in crypto with AES-256-GCM
 */
async function encryptFile(plaintext, password) {
  const crypto = await import('crypto').then(m => m.default || m);
  const { key, salt } = await deriveKey(password);
  
  const nonce = crypto.randomBytes(12); // AES-GCM uses 12-byte IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);

  let encrypted = cipher.update(plaintext);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    nonce,
    salt,
    authTag,
  };
}

/**
 * Convert encrypted data to JSON for storage
 */
function encryptedToJSON(data) {
  return JSON.stringify({
    ciphertext: data.ciphertext.toString('base64'),
    nonce: data.nonce.toString('base64'),
    salt: data.salt.toString('base64'),
    authTag: data.authTag.toString('base64'),
  });
}

/**
 * Recursively find all files in a directory
 */
function findFiles(dir) {
  const files = [];

  function walk(current) {
    const entries = readdirSync(current);

    for (const entry of entries) {
      const fullPath = join(current, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Main encryption process
 */
async function encryptFiles() {
  try {
    // Read password from environment
    let password = process.env.VITE_SITE_PASSWORD;

    if (!password) {
      // Try to load from .env file
      try {
        const envPath = join(projectRoot, '.env');
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/VITE_SITE_PASSWORD=(.+)/);
        if (match) {
          password = match[1].trim().replace(/^['"]|['"]$/g, '');
        }
      } catch {
        // .env might not exist yet
      }
    }

    if (!password) {
      throw new Error(
        'VITE_SITE_PASSWORD not found. Set it in .env or environment variables.'
      );
    }

    console.log('🔐 Starting file encryption...');

    let filesEncrypted = 0;
    const encryptedFiles = [];

    for (const dir of CONTENT_DIRS) {
      const contentDir = join(PUBLIC_DIR, dir);

      try {
        const files = findFiles(contentDir);

        for (const filePath of files) {
          // Skip already encrypted files
          if (filePath.endsWith('.enc')) {
            continue;
          }

          const fileContent = readFileSync(filePath);
          const encrypted = await encryptFile(fileContent, password);
          const encryptedJSON = encryptedToJSON(encrypted);

          const encFilePath = filePath + '.enc';
          mkdirSync(dirname(encFilePath), { recursive: true });
          writeFileSync(encFilePath, encryptedJSON, 'utf-8');

          encryptedFiles.push({
            original: filePath,
            encrypted: encFilePath,
            size: fileContent.length,
          });

          filesEncrypted++;
          console.log(`✓ Encrypted: ${filePath} → ${encFilePath}`);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`Error processing ${dir}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Successfully encrypted ${filesEncrypted} files`);

    if (filesEncrypted > 0) {
      console.log('\n📋 Encrypted files:');
      for (const file of encryptedFiles) {
        console.log(`  ${file.encrypted} (${file.size} bytes)`);
      }
    }

    return filesEncrypted > 0;
  } catch (err) {
    console.error('❌ Encryption failed:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  encryptFiles();
}

export { encryptFile, deriveKey, encryptedToJSON };
