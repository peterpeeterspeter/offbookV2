import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks, RequestMethod } from 'node-mocks-http';
import healthHandler from '../health';
import { runHealthCheck } from '../../../../scripts/health-check';

// Mock the health check module
jest.mock('../../../../scripts/health-check');

describe('Health Check API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return 200 when all systems are healthy', async () => {
    const mockHealthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        audio: { status: 'healthy', details: 'Audio system available' },
        api: {},
        resources: {
          status: 'healthy',
          memory: {
            heapUsed: 100,
            heapTotal: 200,
            rss: 300
          }
        }
      }
    };

    (runHealthCheck as jest.MockedFunction<typeof runHealthCheck>)
      .mockResolvedValueOnce(mockHealthStatus);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET' as RequestMethod
    });

    await healthHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockHealthStatus);
  });

  it('should return 429 when system is in warning state', async () => {
    const mockHealthStatus = {
      timestamp: new Date().toISOString(),
      status: 'warning',
      checks: {
        audio: { status: 'healthy', details: 'Audio system available' },
        api: {},
        resources: {
          status: 'warning',
          memory: {
            heapUsed: 800,
            heapTotal: 1000,
            rss: 900
          }
        }
      }
    };

    (runHealthCheck as jest.MockedFunction<typeof runHealthCheck>)
      .mockResolvedValueOnce(mockHealthStatus);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET' as RequestMethod
    });

    await healthHandler(req, res);

    expect(res._getStatusCode()).toBe(429);
    expect(JSON.parse(res._getData())).toEqual(mockHealthStatus);
  });

  it('should return 503 when system is unhealthy', async () => {
    const mockHealthStatus = {
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      checks: {
        audio: { status: 'unhealthy', details: 'AudioContext not supported' },
        api: {},
        resources: {
          status: 'healthy',
          memory: {
            heapUsed: 100,
            heapTotal: 200,
            rss: 300
          }
        }
      }
    };

    (runHealthCheck as jest.MockedFunction<typeof runHealthCheck>)
      .mockResolvedValueOnce(mockHealthStatus);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET' as RequestMethod
    });

    await healthHandler(req, res);

    expect(res._getStatusCode()).toBe(503);
    expect(JSON.parse(res._getData())).toEqual(mockHealthStatus);
  });

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST' as RequestMethod
    });

    await healthHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed'
    });
  });

  it('should return 500 when health check fails', async () => {
    const mockError = new Error('Health check failed');
    (runHealthCheck as jest.MockedFunction<typeof runHealthCheck>)
      .mockRejectedValueOnce(mockError);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET' as RequestMethod
    });

    await healthHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      status: 'error',
      timestamp: expect.any(String),
      error: 'Health check failed'
    });
  });
});
