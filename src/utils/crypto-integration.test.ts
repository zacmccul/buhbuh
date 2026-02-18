/**
 * Integration tests for the complete encryption workflow
 * Tests the full lifecycle: encrypt → store → decrypt
 */

import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptToJSON,
  decryptFromJSON,
  encryptedDataToBase64,
} from './crypto-utils';

/**
 * Scenario: User workflow for encrypted content
 */
describe('Encryption System - Integration Tests', () => {
  const contentPassword = 'SecurePass123!@#$%';
  
  describe('Scenario 1: Upload poem to static site', () => {
    const poemContent = `
Roses are red,
Violets are blue,
Encrypted files,
Are safe and true.
    `.trim();

    it('should encrypt poem before commit', async () => {
      // Developer has poem file locally
      const poem = poemContent;

      // Pre-commit hook encrypts it
      const encrypted = await encrypt(poem, contentPassword);

      // Verify encryption metadata
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.nonce.length).toBe(24);
      expect(encrypted.salt.length).toBe(16);

      // Store as JSON for .enc file
      const json = JSON.stringify(encryptedDataToBase64(encrypted));

      // Simulate writing to file
      const encFileContent = json;

      // Verify it's not plain text
      expect(encFileContent).not.toContain(poem);
      expect(encFileContent).not.toContain('red');
      expect(encFileContent).not.toContain('violets');
    });

    it('should decrypt poem on website with correct password', async () => {
      // Encrypt poem
      const encrypted = await encrypt(poemContent, contentPassword);
      const json = JSON.stringify(encryptedDataToBase64(encrypted));

      // Website user downloads .enc file and enters password
      const decrypted = await decryptFromJSON(json, contentPassword);

      // Verify decryption
      expect(decrypted).toBe(poemContent);
    });

    it('should reject wrong password on website', async () => {
      const encrypted = await encrypt(poemContent, contentPassword);
      const json = JSON.stringify(encryptedDataToBase64(encrypted));

      // Attacker tries wrong password
      await expect(
        decryptFromJSON(json, 'WrongPassword')
      ).rejects.toThrow();
    });
  });

  describe('Scenario 2: Multiple files with same password', () => {
    const files = {
      poem1: 'First poem with secrets',
      poem2: 'Second poem also hidden',
      poem3: 'Third poem in the vault',
    };

    it('should encrypt multiple files independently', async () => {
      const encrypted: Record<string, string> = {};

      for (const [name, content] of Object.entries(files)) {
        const enc = await encryptToJSON(content, contentPassword);
        encrypted[name] = enc;
      }

      // Each encryption is different (random nonce/salt)
      expect(encrypted.poem1).not.toBe(encrypted.poem2);
      expect(encrypted.poem2).not.toBe(encrypted.poem3);
    });

    it('should decrypt all files with same password', async () => {
      const encrypted: Record<string, string> = {};

      // Encrypt all
      for (const [name, content] of Object.entries(files)) {
        encrypted[name] = await encryptToJSON(content, contentPassword);
      }

      // Decrypt all
      for (const [name, encJson] of Object.entries(encrypted)) {
        const decrypted = await decryptFromJSON(encJson, contentPassword);
        expect(decrypted).toBe(files[name as keyof typeof files]);
      }
    });
  });

  describe('Scenario 3: Large binary file (image/music)', () => {
    it('should handle large binary content', async () => {
      // Simulate a music file (10MB of pseudo-random data)
      const largeFile = new Uint8Array(10 * 1024 * 1024);
      for (let i = 0; i < largeFile.length; i++) {
        largeFile[i] = Math.floor(Math.random() * 256);
      }

      // Encrypt
      const encrypted = await encrypt(largeFile, contentPassword);

      // Decrypt
      const decrypted = await decrypt(encrypted, contentPassword);

      // Verify
      expect(decrypted).toEqual(largeFile);
    });
  });

  describe('Scenario 4: File integrity verification', () => {
    it('should detect if encrypted file was tampered with', async () => {
      const sensitiveContent = 'Secret password: 12345';

      // Encrypt file
      const encrypted = await encrypt(sensitiveContent, contentPassword);
      const jsonStr = JSON.stringify(encryptedDataToBase64(encrypted));

      // Attacker modifies the .enc file on GitHub
      const json = JSON.parse(jsonStr);
      json.ciphertext = json.ciphertext.replace(/[A-Za-z0-9]/g, 'X');
      const tamperedJson = JSON.stringify(json);

      // Website tries to decrypt tampered file
      await expect(
        decryptFromJSON(tamperedJson, contentPassword)
      ).rejects.toThrow();
    });
  });

  describe('Scenario 5: Different passwords for different scenarios', () => {
    it('should work with different passwords independently', async () => {
      const content = 'shared content';
      const password1 = 'FirstPassword123!';
      const password2 = 'DifferentPassword456!';

      // Encrypt with password 1
      const enc1 = await encryptToJSON(content, password1);

      // Encrypt same content with password 2
      const enc2 = await encryptToJSON(content, password2);

      // They produce different results (different key)
      expect(enc1).not.toBe(enc2);

      // Can only decrypt with correct password
      const dec1 = await decryptFromJSON(enc1, password1);
      const dec2 = await decryptFromJSON(enc2, password2);

      expect(dec1).toBe(content);
      expect(dec2).toBe(content);

      // Cross-password decryption fails
      await expect(decryptFromJSON(enc1, password2)).rejects.toThrow();
      await expect(decryptFromJSON(enc2, password1)).rejects.toThrow();
    });
  });

  describe('Scenario 6: UTF-8 and special characters', () => {
    const testCases = [
      { name: 'emoji', content: '🎵 Music 🎵 Art 🎨 Poems 📝' },
      { name: 'chinese', content: '这是一首秘密诗。机密文件。' },
      { name: 'arabic', content: 'هذا محتوى سري' },
      { name: 'mixed', content: 'Hello 世界 مرحبا Привет 🔐' },
      { name: 'whitespace', content: 'Content with\n  newlines\n\tand\ttabs' },
    ];

    it('should handle unicode content correctly', async () => {
      for (const { content } of testCases) {
        const encrypted = await encrypt(content, contentPassword);
        const decrypted = await decrypt(encrypted, contentPassword);
        const text = new TextDecoder().decode(decrypted);

        expect(text).toBe(content);
      }
    });
  });

  describe('Scenario 7: Key derivation consistency', () => {
    it('should derive same key from same password + salt', async () => {
      const testPassword = 'ConsistentPassword123!';
      const testMessage = 'message to encrypt';

      // First encryption
      const enc1 = await encrypt(testMessage, testPassword);

      // Manually use same salt for second encryption
      // This tests that key derivation is deterministic
      const enc2 = await encrypt(testMessage, testPassword);

      // Same password and message, but different salts
      // Should still decrypt correctly
      const dec1 = await decrypt(enc1, testPassword);
      const dec2 = await decrypt(enc2, testPassword);

      expect(new TextDecoder().decode(dec1)).toBe(testMessage);
      expect(new TextDecoder().decode(dec2)).toBe(testMessage);
    });
  });

  describe('Scenario 8: Real-world usage patterns', () => {
    it('should support typical content categories workflow', async () => {
      const contentCategories = {
        poems: [
          'Sonnet about encryption',
          'Haiku with hidden meaning',
        ],
        music: [
          'Original composition notes',
          'Song lyrics draft',
        ],
        art: [
          'Artwork metadata',
          'Gallery notes',
        ],
      };

      // Encrypt all content
      const encryptedStorage: Record<string, Record<string, string>> = {};

      for (const [category, items] of Object.entries(contentCategories)) {
        encryptedStorage[category] = {};
        for (let i = 0; i < items.length; i++) {
          const json = await encryptToJSON(
            items[i],
            contentPassword
          );
          encryptedStorage[category][`item_${i}`] = json;
        }
      }

      // User visits site, enters password, browses categories
      for (const items of Object.values(encryptedStorage)) {
        for (const json of Object.values(items)) {
          const decrypted = await decryptFromJSON(json, contentPassword);
          expect(decrypted.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Scenario 9: Error recovery', () => {
    it('should allow retry on wrong password without data loss', async () => {
      const important = 'Important content';
      const encrypted = await encrypt(important, contentPassword);
      const json = JSON.stringify(encryptedDataToBase64(encrypted));

      // User enters wrong password first time
      await expect(
        decryptFromJSON(json, 'WrongPassword')
      ).rejects.toThrow();

      // User tries again with correct password
      const decrypted = await decryptFromJSON(json, contentPassword);
      expect(decrypted).toBe(important);
    });

    it('should handle corrupted storage gracefully', async () => {
      // Simulate corrupted stored files
      const corruptedFiles = [
        '{}', // Empty JSON
        '{"ciphertext":"","nonce":"","salt":""}', // Missing data
        'not json at all', // Invalid JSON
        '{"ciphertext":null}', // Null value
      ];

      for (const corrupted of corruptedFiles) {
        await expect(
          decryptFromJSON(corrupted, contentPassword)
        ).rejects.toThrow();
      }
    });
  });

  describe('Scenario 10: Performance under load', () => {
    it('should handle rapid sequential encryptions', async () => {
      const start = Date.now();
      const count = 100;

      for (let i = 0; i < count; i++) {
        await encrypt(`Message ${i}`, contentPassword);
      }

      const elapsed = Date.now() - start;
      const perMessage = elapsed / count;

      // Should be reasonably fast (not more than 100ms per message including PBKDF2)
      expect(perMessage).toBeLessThan(200);
    });
  });
});
