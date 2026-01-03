/**
 * Unit tests for CryptoService
 */

import { CryptoService } from '../../../src/services/crypto';

describe('CryptoService', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    // Set test encryption key (64 hex chars = 32 bytes)
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
    cryptoService = new CryptoService();
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', () => {
      const originalData = 'sensitive-credit-card-number';

      const encrypted = cryptoService.encrypt(originalData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalData);
      expect(typeof encrypted).toBe('string');

      const decrypted = cryptoService.decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should handle empty string encryption', () => {
      const originalData = '';

      const encrypted = cryptoService.encrypt(originalData);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      const decrypted = cryptoService.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode', () => {
      const originalData = 'Test with émojis 🎉 and symbols: @#$%^&*()';

      const encrypted = cryptoService.encrypt(originalData);
      const decrypted = cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle numbers as strings', () => {
      const originalData = '1234567890123456';

      const encrypted = cryptoService.encrypt(originalData);
      const decrypted = cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should produce different encrypted output for same input', () => {
      const originalData = 'same-input-data';

      const encrypted1 = cryptoService.encrypt(originalData);
      const encrypted2 = cryptoService.encrypt(originalData);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same original data
      expect(cryptoService.decrypt(encrypted1)).toBe(originalData);
      expect(cryptoService.decrypt(encrypted2)).toBe(originalData);
    });

    it('should handle long strings', () => {
      const originalData = 'a'.repeat(1000);

      const encrypted = cryptoService.encrypt(originalData);
      const decrypted = cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });
  });

  describe('error handling', () => {
    it('should throw error for missing encryption key', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => {
        new CryptoService();
      }).toThrow('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    });

    it('should throw error for invalid encryption key length', () => {
      process.env.ENCRYPTION_KEY = 'too-short';

      expect(() => {
        new CryptoService();
      }).toThrow('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => {
        cryptoService.decrypt('invalid-encrypted-data');
      }).toThrow();
    });

    it('should throw error when decrypting malformed base64', () => {
      expect(() => {
        cryptoService.decrypt('not-base64-data!@#');
      }).toThrow();
    });

    it('should throw error when decrypting data with wrong format', () => {
      const validBase64 = Buffer.from('invalid-format').toString('base64');

      expect(() => {
        cryptoService.decrypt(validBase64);
      }).toThrow();
    });
  });

  describe('security properties', () => {
    it('should use different IV for each encryption', () => {
      const originalData = 'test-data';
      const encrypted1 = cryptoService.encrypt(originalData);
      const encrypted2 = cryptoService.encrypt(originalData);

      // Decode and extract IV (first 16 bytes)
      const buffer1 = Buffer.from(encrypted1, 'base64');
      const buffer2 = Buffer.from(encrypted2, 'base64');

      const iv1 = buffer1.subarray(0, 16);
      const iv2 = buffer2.subarray(0, 16);

      expect(iv1.equals(iv2)).toBe(false);
    });

    it('should produce encrypted data of expected format', () => {
      const originalData = 'test-data';
      const encrypted = cryptoService.encrypt(originalData);

      // Should be base64 encoded
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();

      const buffer = Buffer.from(encrypted, 'base64');

      // Should have at least 16 bytes for IV + some encrypted data
      expect(buffer.length).toBeGreaterThan(16);

      // First 16 bytes should be IV
      const iv = buffer.subarray(0, 16);
      expect(iv.length).toBe(16);
    });

    it('should maintain data integrity across multiple operations', () => {
      const testData = [
        'simple-string',
        '1234567890',
        'special-chars-!@#$%^&*()',
        'unicode-test-🔐🛡️',
        '',
        'very-long-string-'.repeat(50)
      ];

      testData.forEach(data => {
        const encrypted = cryptoService.encrypt(data);
        const decrypted = cryptoService.decrypt(encrypted);
        expect(decrypted).toBe(data);
      });
    });
  });
});