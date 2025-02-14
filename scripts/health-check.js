require("dotenv").config({ path: ".env.local" });
const { logger } = require("./monitor");

async function checkAudioSystem() {
  try {
    // In Node.js environment, we'll check if the required audio packages are available
    const audioPackages = ["node-audiorecorder", "web-audio-api"];
    const missingPackages = [];

    for (const pkg of audioPackages) {
      try {
        require.resolve(pkg);
      } catch (e) {
        missingPackages.push(pkg);
      }
    }

    if (missingPackages.length > 0) {
      return {
        status: "warning",
        details: `Missing optional audio packages: ${missingPackages.join(", ")}`,
      };
    }

    return {
      status: "healthy",
      details: "Audio system dependencies available",
    };
  } catch (error) {
    return { status: "unhealthy", details: error.message };
  }
}

async function checkApiEndpoints() {
  const endpoints = {
    whisper: process.env.WHISPER_API_URL,
    elevenlabs: process.env.ELEVENLABS_API_URL,
    emotion: process.env.EMOTION_API_URL,
  };

  const results = {};

  for (const [name, url] of Object.entries(endpoints)) {
    try {
      if (!url) {
        results[name] = {
          status: "warning",
          error: `${name.toUpperCase()}_API_URL not configured`,
        };
        continue;
      }

      const start = Date.now();
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${process.env[`${name.toUpperCase()}_API_KEY`]}`,
        },
      });
      const latency = Date.now() - start;

      results[name] = {
        status: response.ok ? "healthy" : "unhealthy",
        latency,
        statusCode: response.status,
      };
    } catch (error) {
      results[name] = {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  return results;
}

async function checkResources() {
  const used = process.memoryUsage();
  const maxHeapSize = 1024 * 1024 * 1024; // 1GB

  return {
    status: used.heapUsed < maxHeapSize ? "healthy" : "warning",
    memory: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024),
    },
  };
}

async function runHealthCheck() {
  try {
    const [audioStatus, apiStatus, resourceStatus] = await Promise.all([
      checkAudioSystem(),
      checkApiEndpoints(),
      checkResources(),
    ]);

    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      checks: {
        audio: audioStatus,
        api: apiStatus,
        resources: resourceStatus,
      },
    };

    // Determine overall status
    const apiUnhealthy = Object.values(apiStatus).some(
      (api) => api.status === "unhealthy"
    );
    const apiWarning = Object.values(apiStatus).some(
      (api) => api.status === "warning"
    );

    if (
      audioStatus.status === "unhealthy" ||
      apiUnhealthy ||
      resourceStatus.status === "unhealthy"
    ) {
      healthStatus.status = "unhealthy";
    } else if (
      audioStatus.status === "warning" ||
      apiWarning ||
      resourceStatus.status === "warning"
    ) {
      healthStatus.status = "warning";
    }

    logger.info("Health check completed", healthStatus);
    return healthStatus;
  } catch (error) {
    logger.error("Health check failed", error);
    throw error;
  }
}

// Run health check if called directly
if (require.main === module) {
  runHealthCheck()
    .then((status) => {
      console.log(JSON.stringify(status, null, 2));
      process.exit(status.status === "healthy" ? 0 : 1);
    })
    .catch((error) => {
      console.error("Health check failed:", error);
      process.exit(1);
    });
}

module.exports = {
  runHealthCheck,
  checkAudioSystem,
  checkApiEndpoints,
  checkResources,
};
