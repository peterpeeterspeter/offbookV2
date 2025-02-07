/**
 * Encrypts data using AES encryption
 */
export declare function encrypt(data: unknown): Promise<string>;
/**
 * Decrypts AES encrypted data
 */
export declare function decrypt(encryptedData: string): Promise<unknown>;
