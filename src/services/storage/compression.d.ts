/**
 * Compression utility module for data storage optimization.
 * Uses DEFLATE algorithm through pako library for compression.
 * Handles special cases like null/undefined and provides robust error handling.
 */
/**
 * Compresses data using DEFLATE algorithm and returns a base64 encoded string
 *
 * @param data - Any JSON-serializable data to compress
 * @returns Promise<string> - Base64 encoded compressed data
 * @throws Error if compression fails
 *
 * Special cases:
 * - Returns 'undefined' for undefined input
 * - Returns 'null' for null input
 * - Throws 'Failed to compress data' for compression errors
 *
 * @example
 * ```typescript
 * const data = { foo: 'bar', numbers: [1, 2, 3] };
 * const compressed = await compress(data);
 * ```
 */
export declare function compress(data: unknown): Promise<string>;
/**
 * Decompresses a base64 encoded compressed string back to its original form
 *
 * @param compressedData - Base64 encoded compressed string
 * @returns Promise<unknown> - Original decompressed data
 * @throws Error in the following cases:
 * - 'Invalid compressed data' for empty input
 * - 'Invalid base64 data' for non-base64 input
 * - 'Failed to decompress data: invalid compressed format' for invalid compressed data
 *
 * Special cases:
 * - Returns undefined for 'undefined' input
 * - Returns null for 'null' input
 *
 * @example
 * ```typescript
 * try {
 *   const decompressed = await decompress(compressedString);
 *   console.log(decompressed);
 * } catch (error) {
 *   console.error('Decompression failed:', error);
 * }
 * ```
 */
export declare function decompress(compressedData: string): Promise<unknown>;
