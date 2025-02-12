import { describe, it, expect } from 'vitest';
import { compress, decompress } from '../compression';
import { encrypt, decrypt } from '../encryption';

describe('Compression Utils', () => {
  const testData = {
    id: 'test-1',
    name: 'Test Item'.repeat(100), // Create larger string to test compression
    numbers: Array.from({ length: 1000 }, (_, i) => i), // Large array
  };

  it('should compress and decompress data without loss', async () => {
    const compressed = await compress(testData);
    const decompressed = await decompress(compressed);
    expect(decompressed).toEqual(testData);
  });

  it('should achieve meaningful compression', async () => {
    const original = JSON.stringify(testData);
    const compressed = await compress(testData);
    expect(compressed.length).toBeLessThan(original.length);
  });

  it('should handle empty data', async () => {
    const compressed = await compress({});
    const decompressed = await decompress(compressed);
    expect(decompressed).toEqual({});
  });

  it('should handle null and undefined', async () => {
    const nullCompressed = await compress(null);
    const nullDecompressed = await decompress(nullCompressed);
    expect(nullDecompressed).toBeNull();

    const undefinedCompressed = await compress(undefined);
    const undefinedDecompressed = await decompress(undefinedCompressed);
    expect(undefinedDecompressed).toBeUndefined();
  });

  it('should handle special characters', async () => {
    const specialData = {
      unicode: '🚀 Hello 世界',
      special: '\n\t\r\b\f',
    };
    const compressed = await compress(specialData);
    const decompressed = await decompress(compressed);
    expect(decompressed).toEqual(specialData);
  });

  it('should reject invalid compressed data', async () => {
    // Test with non-base64 data
    await expect(decompress('not-base64-data'))
      .rejects.toThrow('Invalid base64 data');

    // Test with valid base64 but not compressed data
    await expect(decompress('SGVsbG8gV29ybGQh'))
      .rejects.toThrow('Failed to decompress data: invalid compressed format');

    // Test with empty string
    await expect(decompress(''))
      .rejects.toThrow('Invalid compressed data');
  });
});

describe('Encryption Utils', () => {
  const testData = {
    id: 'test-1',
    name: 'Secret Item',
    sensitiveInfo: 'very-secret-value',
  };

  it('should encrypt and decrypt data without loss', async () => {
    const encrypted = await encrypt(testData);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toEqual(testData);
  });

  it('should produce different ciphertext for same data', async () => {
    const encrypted1 = await encrypt(testData);
    const encrypted2 = await encrypt(testData);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should handle empty data', async () => {
    const encrypted = await encrypt({});
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toEqual({});
  });

  it('should handle null and undefined', async () => {
    const nullEncrypted = await encrypt(null);
    const nullDecrypted = await decrypt(nullEncrypted);
    expect(nullDecrypted).toBeNull();

    const undefinedEncrypted = await encrypt(undefined);
    const undefinedDecrypted = await decrypt(undefinedEncrypted);
    expect(undefinedDecrypted).toBeUndefined();
  });

  it('should handle special characters', async () => {
    const specialData = {
      unicode: '🚀 Hello 世界',
      special: '\n\t\r\b\f',
    };
    const encrypted = await encrypt(specialData);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toEqual(specialData);
  });

  it('should reject invalid encrypted data', async () => {
    await expect(decrypt('invalid-data'))
      .rejects.toThrow('Failed to decrypt data');
  });

  it('should use different encryption keys', async () => {
    // Save original key
    const originalKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

    try {
      // Test with key 1
      process.env.NEXT_PUBLIC_ENCRYPTION_KEY = 'key1';
      const encrypted1 = await encrypt(testData);
      const decrypted1 = await decrypt(encrypted1);
      expect(decrypted1).toEqual(testData);

      // Test with key 2
      process.env.NEXT_PUBLIC_ENCRYPTION_KEY = 'key2';
      const encrypted2 = await encrypt(testData);
      const decrypted2 = await decrypt(encrypted2);
      expect(decrypted2).toEqual(testData);

      // Verify different keys produce different results
      expect(encrypted1).not.toBe(encrypted2);

      // Try to decrypt data with wrong key
      process.env.NEXT_PUBLIC_ENCRYPTION_KEY = 'key1';
      await expect(decrypt(encrypted2)).rejects.toThrow('Failed to decrypt data');
    } finally {
      // Always restore original key
      process.env.NEXT_PUBLIC_ENCRYPTION_KEY = originalKey;
    }
  });
});
