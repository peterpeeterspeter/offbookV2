import { deflate, inflate } from 'pako';

/**
 * Compresses data using DEFLATE algorithm
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
 * Decompresses data using DEFLATE algorithm
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

    const compressed = Buffer.from(compressedData, 'base64');
    const decompressed = inflate(compressed);
    const jsonString = Buffer.from(decompressed).toString();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decompression failed:', error);
    throw new Error('Failed to decompress data');
  }
}
