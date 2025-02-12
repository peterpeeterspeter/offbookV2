import type { Matchers as JestMatchers } from '@jest/expect';

declare global {
  namespace jest {
    type MockedFunction<T extends (...args: any[]) => any> = {
      (...args: Parameters<T>): ReturnType<T>;
      mockClear: () => void;
      mockReset: () => void;
      mockImplementation: (fn: (...args: Parameters<T>) => ReturnType<T>) => void;
      mockImplementationOnce: (fn: (...args: Parameters<T>) => ReturnType<T>) => void;
      mockResolvedValue: (value: Awaited<ReturnType<T>>) => void;
      mockResolvedValueOnce: (value: Awaited<ReturnType<T>>) => void;
      mockRejectedValue: (value: any) => void;
      mockRejectedValueOnce: (value: any) => void;
    };
  }

  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }

  interface Navigator {
    mediaDevices: {
      getUserMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
    };
  }

  // Extend fetch mock functionality
  interface FetchMock extends Function {
    mockClear: () => void;
    mockImplementation: (fn: typeof fetch) => void;
    mockImplementationOnce: (fn: typeof fetch) => void;
  }

  var fetch: FetchMock;
}

declare module 'node-mocks-http' {
  import type { NextApiRequest, NextApiResponse } from 'next';

  export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  export interface MockResponse<T = any> extends NextApiResponse<T> {
    _getStatusCode(): number;
    _getData(): string;
  }

  export function createMocks<T = any>(options?: {
    method?: RequestMethod;
    body?: any;
    query?: any;
  }): {
    req: NextApiRequest;
    res: MockResponse<T>;
  };
}

export {};
