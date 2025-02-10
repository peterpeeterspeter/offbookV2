/**
 * Compresses data using DEFLATE algorithm
 */
export declare function compress(data: unknown): Promise<string>;
/**
 * Decompresses data using DEFLATE algorithm
 */
export declare function decompress(compressedData: string): Promise<unknown>;
