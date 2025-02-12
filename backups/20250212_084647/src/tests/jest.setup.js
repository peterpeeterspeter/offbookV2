// Add fetch polyfill
const fetch = require('node-fetch');
global.fetch = fetch;
global.Response = fetch.Response;
global.Headers = fetch.Headers;
global.Request = fetch.Request;

// Add web streams API
const { ReadableStream, TransformStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;

// Add Uint8Array if not available
if (!global.Uint8Array) {
  global.Uint8Array = Uint8Array;
}

// Add TextEncoder for stream operations
const { TextEncoder } = require('util');
global.TextEncoder = TextEncoder; 