import { AES, enc } from 'crypto-js';

/**
 * Encryption utility module for secure data storage.
 * Uses AES encryption through crypto-js library.
 * Handles special cases like null/undefined and provides robust error handling.
 */

/**
 * Gets the encryption key from environment variables
 * Falls back to a development key if not set (should only be used in development)
 */
const getEncryptionKey = () => process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-dev-key';

/**
 * Encrypts data using AES encryption
 *
 * @param data - Any JSON-serializable data to encrypt
 * @returns Promise<string> - Encrypted data string
 * @throws Error if encryption fails
 *
 * Special cases:
 * - Returns 'undefined' for undefined input
 * - Returns 'null' for null input
 * - Throws 'Failed to encrypt data' for encryption errors
 *
 * @example
 * ```typescript
 * const data = { sensitive: 'information' };
 * const encrypted = await encrypt(data);
 * ```
 */
export async function encrypt(data: unknown): Promise<string> {
  try {
    // Handle null/undefined
    if (data === undefined) {
      return 'undefined';
    }
    if (data === null) {
      return 'null';
    }

    const jsonString = JSON.stringify(data);
    return AES.encrypt(jsonString, getEncryptionKey()).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts AES encrypted data back to its original form
 *
 * @param encryptedData - AES encrypted string
 * @returns Promise<unknown> - Original decrypted data
 * @throws Error in the following cases:
 * - 'Failed to decrypt data' for invalid/corrupted encrypted data
 * - 'Failed to decrypt data' for wrong encryption key
 *
 * Special cases:
 * - Returns undefined for 'undefined' input
 * - Returns null for 'null' input
 *
 * @example
 * ```typescript
 * try {
 *   const decrypted = await decrypt(encryptedString);
 *   console.log(decrypted);
 * } catch (error) {
 *   console.error('Decryption failed:', error);
 * }
 * ```
 */
export async function decrypt(encryptedData: string): Promise<unknown> {
  try {
    // Handle special values for null/undefined
    if (encryptedData === 'undefined') {
      return undefined;
    }
    if (encryptedData === 'null') {
      return null;
    }
    if (!encryptedData) {
      throw new Error('Failed to decrypt data');
    }

    try {
      const decrypted = AES.decrypt(encryptedData, getEncryptionKey());
      const jsonString = decrypted.toString(enc.Utf8);
      if (!jsonString) {
        throw new Error('Failed to decrypt data');
      }
      return JSON.parse(jsonString);
    } catch (error) {
      // Rethrow with consistent error message
      throw new Error('Failed to decrypt data');
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error instanceof Error ? error : new Error('Failed to decrypt data');
  }
}
