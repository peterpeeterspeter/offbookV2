import { jest } from '@jest/globals'
import { Blob } from 'buffer'
import { ReadableStream } from 'stream/web'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_DEEPSEEK_API_KEY: string
      REACT_APP_ELEVENLABS_API_KEY: string
    }
  }
}

// Mock environment variables
process.env.REACT_APP_DEEPSEEK_API_KEY = 'test-key'
process.env.REACT_APP_ELEVENLABS_API_KEY = 'test-key'

// Mock fetch
const mockFetch = jest.fn().mockImplementation(() => 
  Promise.resolve(new Response())
) as jest.MockedFunction<typeof fetch>

global.fetch = mockFetch

// Mock web APIs if needed
if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream as unknown as typeof global.ReadableStream
}

if (!global.Blob) {
  global.Blob = Blob as unknown as typeof global.Blob
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockClear()
}) 

