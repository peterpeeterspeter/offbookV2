import { NextApiRequest, NextApiResponse } from 'next';
import { runHealthCheck } from '../../../scripts/health-check';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const healthStatus = await runHealthCheck();

    // Set appropriate status code based on health status
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'warning' ? 429 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
