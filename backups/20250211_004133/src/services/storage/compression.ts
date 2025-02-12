import { deflate, inflate } from 'pako';

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
export async function compress(data: unknown): Promise<string> {
  try {
    // Handle null/undefined
    if (data === undefined) {
      return 'undefined';
    }
    if (data === null) {
      return 'null';
    }

    const jsonString = JSON.stringify(data);
    const compressed = deflate(jsonString);
    return Buffer.from(compressed).toString('base64');
  } catch (error) {
    console.error('Compression failed:', error);
    throw new Error('Failed to compress data');
  }
}

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
export async function decompress(compressedData: string): Promise<unknown> {
  try {
    // Handle special values for null/undefined
    if (compressedData === 'undefined') {
      return undefined;
    }
    if (compressedData === 'null') {
      return null;
    }
    if (!compressedData) {
      throw new Error('Invalid compressed data');
    }

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compressedData)) {
      throw new Error('Invalid base64 data');
    }

    try {
      const compressed = Buffer.from(compressedData, 'base64');
      const decompressed = inflate(compressed);
      const jsonString = Buffer.from(decompressed).toString();
      return JSON.parse(jsonString);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('incorrect header check')) {
          throw new Error('Failed to decompress data: invalid compressed format');
        }
        if (error.message.includes('invalid distance too far back')) {
          throw new Error('Failed to decompress data: invalid compressed format');
        }
      }
      throw new Error('Failed to decompress data: invalid compressed format');
    }
  } catch (error) {
    console.error('Decompression failed:', error);
    if (error instanceof Error) {
      throw error; // Re-throw the specific error
    }
    throw new Error('Failed to decompress data');
  }
}
