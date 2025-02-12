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
export declare function encrypt(data: unknown): Promise<string>;
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
export declare function decrypt(encryptedData: string): Promise<unknown>;
