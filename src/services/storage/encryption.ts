import { AES, enc } from 'crypto-js';

// Get encryption key from environment
const getEncryptionKey = () => process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-dev-key';

/**
 * Encrypts data using AES encryption
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
 * Decrypts AES encrypted data
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
