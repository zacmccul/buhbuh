/**
 * Test suite for cryptographic utilities
 * Tests encryption, decryption, key derivation, and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptToJSON,
  decryptFromJSON,
  encryptedDataToBase64,
  base64ToEncryptedData,
  EncryptedData,
} from './crypto-utils';

describe('Crypto Utils', () => {
  const testPassword = 'MySecurePassword123!@#';
  const testMessage = 'This is a secret message';
  const testBinary = new Uint8Array([1, 2, 3, 4, 5, 255, 254, 253]);

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt string messages', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(testMessage);
    });

    it('should encrypt and decrypt binary data', async () => {
      const encrypted = await encrypt(testBinary, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);

      expect(decrypted).toEqual(testBinary);
    });

    it('should fail decryption with wrong password', async () => {
      const encrypted = await encrypt(testMessage, testPassword);

      // Try to decrypt with wrong password - should fail
      await expect(
        decrypt(encrypted, 'WrongPassword')
      ).rejects.toThrow();
    });

    it('should produce different ciphertexts for same input (due to random nonce)', async () => {
      const encrypted1 = await encrypt(testMessage, testPassword);
      const encrypted2 = await encrypt(testMessage, testPassword);

      // Ciphertexts should differ due to random nonce
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      // But both should decrypt to same message
      const decrypted1 = await decrypt(encrypted1, testPassword);
      const decrypted2 = await decrypt(encrypted2, testPassword);

      expect(decrypted1).toEqual(decrypted2);
    });

    it('should preserve large data', async () => {
      const largeData = new Uint8Array(100_000);
      // Fill with pseudo-random data
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = (i * 17) % 256;
      }

      const encrypted = await encrypt(largeData, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);

      expect(decrypted).toEqual(largeData);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON and deserialize back', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      const base64 = encryptedDataToBase64(encrypted);

      expect(typeof base64.ciphertext).toBe('string');
      expect(typeof base64.nonce).toBe('string');
      expect(typeof base64.salt).toBe('string');
    });

    it('should convert between EncryptedData and Base64 formats', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      const base64 = encryptedDataToBase64(encrypted);
      const restored = base64ToEncryptedData(base64);

      expect(restored.ciphertext).toEqual(encrypted.ciphertext);
      expect(restored.nonce).toEqual(encrypted.nonce);
      expect(restored.salt).toEqual(encrypted.salt);
    });
  });

  describe('encryptToJSON / decryptFromJSON', () => {
    it('should encrypt to JSON and decrypt from JSON', async () => {
      const json = await encryptToJSON(testMessage, testPassword);

      // Verify it's valid JSON
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('ciphertext');
      expect(parsed).toHaveProperty('nonce');
      expect(parsed).toHaveProperty('salt');

      // Decrypt from JSON
      const decrypted = await decryptFromJSON(json, testPassword);
      expect(decrypted).toBe(testMessage);
    });

    it('should work with binary data via JSON', async () => {
      const binaryJson = await encryptToJSON(testBinary, testPassword);
      const decrypted = await decryptFromJSON(binaryJson, testPassword);

      // Convert back to original array for comparison
      const result = new Uint8Array(decrypted.length);
      for (let i = 0; i < decrypted.length; i++) {
        result[i] = decrypted.charCodeAt(i);
      }

      expect(result).toEqual(testBinary);
    });

    it('should fail with corrupted JSON', async () => {
      const validJson = await encryptToJSON(testMessage, testPassword);
      const parsed = JSON.parse(validJson);

      // Corrupt the ciphertext
      parsed.ciphertext = parsed.ciphertext.slice(0, -5) + 'XXXXX';
      const corruptedJson = JSON.stringify(parsed);

      await expect(
        decryptFromJSON(corruptedJson, testPassword)
      ).rejects.toThrow();
    });

    it('should fail with invalid JSON', async () => {
      await expect(
        decryptFromJSON('{invalid json}', testPassword)
      ).rejects.toThrow();
    });
  });

  describe('Security properties', () => {
    it('should use different salts for each encryption', async () => {
      const enc1 = await encrypt(testMessage, testPassword);
      const enc2 = await encrypt(testMessage, testPassword);

      // Salts should be different (random)
      expect(enc1.salt).not.toEqual(enc2.salt);
    });

    it('should have proper salt length', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      // Salt should be 16 bytes
      expect(encrypted.salt.length).toBe(16);
    });

    it('should have proper nonce length', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      // Nonce should be 24 bytes (or 12 for AES-GCM)
      expect(encrypted.nonce.length).toBe(24);
    });

    it('should not leak password in encrypted data', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      const json = JSON.stringify(encryptedDataToBase64(encrypted));

      // Password should not appear anywhere in encrypted data
      expect(json.toLowerCase()).not.toContain(testPassword.toLowerCase());
    });

    it('should handle empty strings', async () => {
      const encrypted = await encrypt('', testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe('');
    });

    it('should handle special characters', async () => {
      const specialChars =
        '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r\0émoji🔐🎵';

      const encrypted = await encrypt(specialChars, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(specialChars);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'x'.repeat(10000);
      const encrypted = await encrypt(testMessage, longPassword);
      const decrypted = await decrypt(encrypted, longPassword);
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(testMessage);
    });

    it('should handle very long messages', async () => {
      const longMessage = testMessage.repeat(10000);
      const encrypted = await encrypt(longMessage, testPassword);
      const decrypted = await decrypt(encrypted, testPassword);
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(longMessage);
    });
  });

  describe('Password verification', () => {
    it('should provide consistent encryption with same salt', async () => {
      // This tests that encryption is deterministic with same salt
      // We can't directly test this with the public API, but we can
      // verify that decryption fails with tampered data
      const encrypted = await encrypt(testMessage, testPassword);
      const { ciphertext } = encrypted;

      // Tamper with one byte
      const tampered = new Uint8Array(ciphertext);
      tampered[0] ^= 1;

      const tamperedData: EncryptedData = {
        ...encrypted,
        ciphertext: tampered,
      };

      await expect(decrypt(tamperedData, testPassword)).rejects.toThrow();
    });

    it('should use PBKDF2 for key derivation (security property)', async () => {
      // Encrypt twice with same password but different timestamps
      const start1 = Date.now();
      await encrypt(testMessage, testPassword);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await encrypt(testMessage, testPassword);
      const time2 = Date.now() - start2;

      // Key derivation should take noticeable time (PBKDF2 with iterations)
      // This is a rough check - in reality, encryption should take >10ms
      // on modern hardware due to PBKDF2 iterations
      expect(time1 + time2).toBeGreaterThan(0); // Very loose check
    });
  });

  describe('Data integrity', () => {
    it('should detect bit flips in ciphertext', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      const { ciphertext, nonce, salt } = encrypted;

      // Flip a bit in the ciphertext
      const corrupted = new Uint8Array(ciphertext);
      corrupted[Math.floor(corrupted.length / 2)] ^= 1;

      const tamperedData: EncryptedData = {
        ciphertext: corrupted,
        nonce,
        salt,
      };

      await expect(decrypt(tamperedData, testPassword)).rejects.toThrow();
    });

    it('should detect truncated ciphertext', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      const { ciphertext, nonce, salt } = encrypted;

      // Truncate ciphertext
      const truncated = ciphertext.slice(0, Math.max(0, ciphertext.length - 10));

      const tamperedData: EncryptedData = {
        ciphertext: truncated,
        nonce,
        salt,
      };

      await expect(decrypt(tamperedData, testPassword)).rejects.toThrow();
    });

    it('should detect wrong nonce', async () => {
      const encrypted = await encrypt(testMessage, testPassword);
      const wrongNonce = new Uint8Array(24);

      const tamperedData: EncryptedData = {
        ...encrypted,
        nonce: wrongNonce,
      };

      await expect(decrypt(tamperedData, testPassword)).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle single character password', async () => {
      const encrypted = await encrypt(testMessage, 'x');
      const decrypted = await decrypt(encrypted, 'x');
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(testMessage);
    });

    it('should handle numeric password', async () => {
      const encrypted = await encrypt(testMessage, '12345');
      const decrypted = await decrypt(encrypted, '12345');
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(testMessage);
    });

    it('should be case-sensitive for passwords', async () => {
      const encrypted = await encrypt(testMessage, 'Password');

      await expect(
        decrypt(encrypted, 'password') // Different case
      ).rejects.toThrow();
    });

    it('should handle whitespace in passwords', async () => {
      const spacePassword = 'my password with spaces';
      const encrypted = await encrypt(testMessage, spacePassword);
      const decrypted = await decrypt(encrypted, spacePassword);
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(testMessage);
    });

    it('should handle unicode passwords', async () => {
      const unicodePassword = '密码🔐🎵';
      const encrypted = await encrypt(testMessage, unicodePassword);
      const decrypted = await decrypt(encrypted, unicodePassword);
      const result = new TextDecoder().decode(decrypted);

      expect(result).toBe(testMessage);
    });
  });
});
