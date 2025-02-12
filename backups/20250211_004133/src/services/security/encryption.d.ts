/**
 * Enhanced encryption service with key rotation and integrity checks
 */
export declare class EncryptionService {
    private masterKey;
    constructor(masterKey?: string);
    /**
     * Encrypts data with integrity check
     */
    encrypt(data: any): Promise<string>;
    /**
     * Decrypts data and verifies integrity
     */
    decrypt(encryptedStr: string): Promise<any>;
    /**
     * Creates a hash of the data for integrity checking
     */
    private createHash;
    /**
     * Rotates the encryption key for stored data
     */
    rotateKey(data: string, newKey: string): Promise<string>;
}
