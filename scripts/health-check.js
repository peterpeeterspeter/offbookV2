const { logger } = require('./monitor');

async function checkAudioSystem() {
  try {
    // Check if AudioContext is available
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      throw new Error('AudioContext not supported');
    }
    return { status: 'healthy', details: 'Audio system available' };
  } catch (error) {
    return { status: 'unhealthy', details: error.message };
  }
}

async function checkApiEndpoints() {
  const endpoints = {
    whisper: process.env.WHISPER_API_ENDPOINT,
    elevenlabs: process.env.ELEVENLABS_API_ENDPOINT,
    emotion: process.env.EMOTION_API_ENDPOINT
  };

  const results = {};

  for (const [name, url] of Object.entries(endpoints)) {
    try {
      const start = Date.now();
      const response = await fetch(url);
      const latency = Date.now() - start;

      results[name] = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency,
        statusCode: response.status
      };
    } catch (error) {
      results[name] = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  return results;
}

async function checkResources() {
  const used = process.memoryUsage();
  const maxHeapSize = 1024 * 1024 * 1024; // 1GB

  return {
    status: used.heapUsed < maxHeapSize ? 'healthy' : 'warning',
    memory: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024)
    }
  };
}

async function runHealthCheck() {
  try {
    const [audioStatus, apiStatus, resourceStatus] = await Promise.all([
      checkAudioSystem(),
      checkApiEndpoints(),
      checkResources()
    ]);

    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        audio: audioStatus,
        api: apiStatus,
        resources: resourceStatus
      }
    };

    // Determine overall status
    if (audioStatus.status === 'unhealthy' ||
        Object.values(apiStatus).some(api => api.status === 'unhealthy') ||
        resourceStatus.status === 'unhealthy') {
      healthStatus.status = 'unhealthy';
    } else if (resourceStatus.status === 'warning') {
      healthStatus.status = 'warning';
    }

    logger.info('Health check completed', healthStatus);
    return healthStatus;
  } catch (error) {
    logger.error('Health check failed', error);
    throw error;
  }
}

// Run health check if called directly
if (require.main === module) {
  runHealthCheck()
    .then(status => {
      console.log(JSON.stringify(status, null, 2));
      process.exit(status.status === 'healthy' ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runHealthCheck,
  checkAudioSystem,
  checkApiEndpoints,
  checkResources
};
