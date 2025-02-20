const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,

  // Built-in optimizations
  optimizeFonts: true,

  // Disable static optimization for specific routes
  rewrites: async () => {
    return [
      {
        source: "/not-found",
        destination: "/404",
      },
      {
        source: "/favicon.ico",
        destination: "/public/favicon.ico",
      },
    ];
  },

  // Configure webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(process.cwd(), "src"),
    };

    return config;
  },

  // Environment variables that should be exposed to the client
  env: {
    NEXT_PUBLIC_DAILY_API_KEY: process.env.NEXT_PUBLIC_DAILY_API_KEY,
    NEXT_PUBLIC_DAILY_DOMAIN: process.env.NEXT_PUBLIC_DAILY_DOMAIN,
    NEXT_PUBLIC_DAILY_ROOM_URL: process.env.NEXT_PUBLIC_DAILY_ROOM_URL,
    NEXT_PUBLIC_ERROR_REPORTING_URL:
      process.env.NEXT_PUBLIC_ERROR_REPORTING_URL,
    NEXT_PUBLIC_LOG_REMOTE_ENDPOINT:
      process.env.NEXT_PUBLIC_LOG_REMOTE_ENDPOINT,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Error handling during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Page configuration
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  trailingSlash: false,
  generateBuildId: () => {
    return "build-" + Date.now();
  },
};

module.exports = nextConfig;
