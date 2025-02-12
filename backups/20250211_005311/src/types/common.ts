/**
 * Generic dictionary type for key-value pairs
 */
export type Dict<V = unknown> = {
  [key: string]: V
};

/**
 * Utility type to make all properties of T non-nullable
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Utility type for function parameters
 */
export type FunctionParams<T> = T extends (...args: infer P) => any ? P : never;

/**
 * Utility type for async function return types
 */
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;
