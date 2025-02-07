import { createHash, createCipheriv, createDecipheriv, randomBytes, scrypt, BinaryLike, CipherGCM, DecipherGCM } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify<BinaryLike, BinaryLike, number, Buffer>(scrypt);

interface EncryptedData {
  /** Encrypted data as base64 */
  data: string;
  /** Initialization vector as base64 */
  iv: string;
  /** Salt used for key derivation as base64 */
  salt: string;
  /** Version of encryption used */
  version: number;
  /** Integrity hash of original data */
  hash: string;
}

const CURRENT_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

/**
 * Enhanced encryption service with key rotation and integrity checks
 */
export class EncryptionService {
  private masterKey: string;

  constructor(masterKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '') {
    if (!masterKey) {
      throw new Error('Encryption key is required');
    }
    this.masterKey = masterKey;
  }

  /**
   * Encrypts data with integrity check
   */
  async encrypt(data: any): Promise<string> {
    // Generate salt and IV
    const salt = randomBytes(16);
    const iv = randomBytes(12);

    // Derive key from master key and salt
    const key = await scryptAsync(this.masterKey, salt, KEY_LENGTH);

    // Create cipher
    const cipher: CipherGCM = createCipheriv(ALGORITHM, key, iv) as CipherGCM;

    // Convert data to string and create hash
    const jsonData = JSON.stringify(data);
    const hash = this.createHash(jsonData);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(jsonData, 'utf8'),
      cipher.final()
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine encrypted data with auth tag
    const finalData = Buffer.concat([encrypted, authTag]);

    // Create encrypted data object
    const encryptedData: EncryptedData = {
      data: finalData.toString('base64'),
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      version: CURRENT_VERSION,
      hash
    };

    return JSON.stringify(encryptedData);
  }

  /**
   * Decrypts data and verifies integrity
   */
  async decrypt(encryptedStr: string): Promise<any> {
    try {
      // Parse encrypted data
      const encrypted: EncryptedData = JSON.parse(encryptedStr);

      // Verify version
      if (encrypted.version !== CURRENT_VERSION) {
        throw new Error('Unsupported encryption version');
      }

      // Convert base64 to buffers
      const data = Buffer.from(encrypted.data, 'base64');
      const iv = Buffer.from(encrypted.iv, 'base64');
      const salt = Buffer.from(encrypted.salt, 'base64');

      // Split data and auth tag
      const encryptedData = data.slice(0, -16);
      const authTag = data.slice(-16);

      // Derive key
      const key = await scryptAsync(this.masterKey, salt, KEY_LENGTH);

      // Create decipher
      const decipher: DecipherGCM = createDecipheriv(ALGORITHM, key, iv) as DecipherGCM;
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]).toString('utf8');

      // Verify integrity
      const hash = this.createHash(decrypted);
      if (hash !== encrypted.hash) {
        throw new Error('Data integrity check failed');
      }

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt data: ' + (error as Error).message);
    }
  }

  /**
   * Creates a hash of the data for integrity checking
   */
  private createHash(data: string): string {
    return createHash('sha256')
      .update(data)
      .digest('base64');
  }

  /**
   * Rotates the encryption key for stored data
   */
  async rotateKey(data: string, newKey: string): Promise<string> {
    const decrypted = await this.decrypt(data);
    const oldKey = this.masterKey;
    this.masterKey = newKey;
    const reEncrypted = await this.encrypt(decrypted);
    this.masterKey = oldKey;
    return reEncrypted;
  }
}
