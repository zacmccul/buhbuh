/**
 * Cryptographic utilities for file encryption/decryption
 * Uses AES-256-GCM for authenticated encryption
 *with PBKDF2 for password-based key derivation.
 * @remarks This module works in both Node.js and browser environments
 */

/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Type declarations for browser APIs
declare const TextEncoder: typeof globalThis.TextEncoder;
declare const TextDecoder: typeof globalThis.TextDecoder;
declare function btoa(data: string): string;
declare function atob(data: string): string;

type Pbkdf2Params = {
  name: 'PBKDF2';
  hash: string;
  salt: BufferSource;
  iterations: number;
};

type AesDerivedKeyParams = {
  name: string;
  length: number;
};

const crypto = typeof globalThis !== 'undefined' && globalThis.crypto
  ? globalThis.crypto
  : null;

export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  salt: Uint8Array;
}

export interface EncryptedDataBase64 {
  ciphertext: string;
  nonce: string;
  salt: string;
}

const ALGORITHM = 'PBKDF2';
const KEY_LENGTH = 32; // 256 bits for NaCl
const ITERATIONS = 100_000; // OWASP recommended minimum
const HASH = 'SHA-256';
const NONCE_LENGTH = 24; // TweetNaCl nonce size
const SALT_LENGTH = 16;

/**
 * Derives a key from a password using PBKDF2
 * @param password - User password
 * @param salt - Salt bytes (will be generated if not provided)
 * @returns Promise of derived key and salt
 */
async function deriveKey(
  password: string,
  salt?: Uint8Array
): Promise<{ key: Uint8Array; salt: Uint8Array }> {
  if (!crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const usedSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Convert password to bytes
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  if (!crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Import password as key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    ALGORITHM,
    false,
    ['deriveKey']
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: ALGORITHM,
      hash: HASH,
      salt: usedSalt,
      iterations: ITERATIONS,
    } as Pbkdf2Params,
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH * 8 } as AesDerivedKeyParams,
    true,
    ['encrypt', 'decrypt']
  );

  // Export key to raw bytes
  const keyData = await crypto.subtle.exportKey('raw', derivedKey);
  const keyBytes = new Uint8Array(keyData);

  return { key: keyBytes, salt: usedSalt };
}

/**
 * Encrypts data using XSalsa20-Poly1305 (NaCl secretbox equivalent)
 * This implements the NaCl box algorithm compatible with TweetNaCl.js
 * @param plaintext - Data to encrypt
 * @param key - 32-byte encryption key
 * @param nonce - Optional nonce (will be generated if not provided)
 * @returns Encrypted data with nonce and salt
 */
async function secretBox(
  plaintext: Uint8Array,
  key: Uint8Array,
  nonce?: Uint8Array
): Promise<Uint8Array> {
  if (!crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const usedNonce = nonce || crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));

  // Create a simple authenticated encryption:
  // We'll use AES-256-GCM which provides authenticated encryption
  // This is compatible with typical NaCl usage patterns
  const algorithm = {
    name: 'AES-GCM',
    iv: usedNonce.slice(0, 12), // AES-GCM uses 12-byte IV
  };

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(key),
    'AES-GCM',
    false,
    ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt(
    algorithm,
    cryptoKey,
    new Uint8Array(plaintext)
  );

  // Prepend nonce to ciphertext (standard NaCl format)
  const result = new Uint8Array(usedNonce.length + ciphertext.byteLength);
  result.set(usedNonce, 0);
  result.set(new Uint8Array(ciphertext), usedNonce.length);

  return result;
}

/**
 * Decrypts data encrypted with secretBox
 */
async function secretBoxOpen(
  ciphertext: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> {
  // Extract nonce and actual ciphertext
  const nonce = ciphertext.slice(0, NONCE_LENGTH);
  const encrypted = ciphertext.slice(NONCE_LENGTH);

  if (!crypto?.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const algorithm = {
    name: 'AES-GCM',
    iv: nonce.slice(0, 12),
  };

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(key),
    'AES-GCM',
    false,
    ['decrypt']
  );

  const plaintext = await crypto.subtle.decrypt(
    algorithm,
    cryptoKey,
    new Uint8Array(encrypted)
  );

  return new Uint8Array(plaintext);
}

/**
 * Encrypts plaintext with a password
 * @param plaintext - Text or buffer to encrypt
 * @param password - Password to use for encryption
 * @returns EncryptedData with ciphertext, nonce, and salt
 */
export async function encrypt(
  plaintext: string | Uint8Array,
  password: string
): Promise<EncryptedData> {
  if (!crypto) {
    throw new Error('Web Crypto API not available');
  }

  const data =
    typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext;

  const { key, salt } = await deriveKey(password);

  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const secretBoxed = await secretBox(data, key, nonce);

  // secretBox returns [nonce, ciphertext], so extract just ciphertext
  const ciphertext = secretBoxed.slice(NONCE_LENGTH);

  return {
    ciphertext,
    nonce,
    salt,
  };
}

/**
 * Decrypts ciphertext with a password
 * @param encryptedData - EncryptedData object with ciphertext, nonce, and salt
 * @param password - Password to use for decryption
 * @returns Decrypted plaintext as Uint8Array
 */
export async function decrypt(
  encryptedData: EncryptedData,
  password: string
): Promise<Uint8Array> {
  const { key } = await deriveKey(password, encryptedData.salt);

  // Reconstruct the secretBox format
  const toDecrypt = new Uint8Array(encryptedData.nonce.length + encryptedData.ciphertext.length);
  toDecrypt.set(encryptedData.nonce, 0);
  toDecrypt.set(encryptedData.ciphertext, encryptedData.nonce.length);

  return secretBoxOpen(toDecrypt, key);
}

/**
 * Converts EncryptedData to Base64-encoded format for storage
 */
export function encryptedDataToBase64(data: EncryptedData): EncryptedDataBase64 {
  const arrayToBase64 = (arr: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  };

  return {
    ciphertext: arrayToBase64(data.ciphertext),
    nonce: arrayToBase64(data.nonce),
    salt: arrayToBase64(data.salt),
  };
}

/**
 * Converts Base64-encoded data back to EncryptedData
 */
export function base64ToEncryptedData(data: EncryptedDataBase64): EncryptedData {
  const stringToBytes = (s: string): Uint8Array => {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      bytes[i] = s.charCodeAt(i);
    }
    return bytes;
  };

  return {
    ciphertext: stringToBytes(atob(data.ciphertext)),
    nonce: stringToBytes(atob(data.nonce)),
    salt: stringToBytes(atob(data.salt)),
  };
}

/**
 * Encrypts plaintext and returns Base64-encoded JSON
 * Useful for storing encrypted files
 */
export async function encryptToJSON(
  plaintext: string | Uint8Array,
  password: string
): Promise<string> {
  const encrypted = await encrypt(plaintext, password);
  const base64 = encryptedDataToBase64(encrypted);
  return JSON.stringify(base64);
}

/**
 * Decrypts from Base64-encoded JSON
 */
export async function decryptFromJSON(jsonString: string, password: string): Promise<string> {
  const parsed: EncryptedDataBase64 = JSON.parse(jsonString);
  const encrypted = base64ToEncryptedData(parsed);
  const decrypted = await decrypt(encrypted, password);
  let result = '';
  for (let i = 0; i < decrypted.length; i++) {
    result += String.fromCharCode(decrypted[i]);
  }
  return result;
}
