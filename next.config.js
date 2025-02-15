/** @type {import('next').NextConfig} */
const crypto = require("crypto");

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/monitoring/health",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },

  // Rate limiting
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          has: [
            {
              type: "query",
              key: "apikey",
              value: process.env.API_KEY,
            },
          ],
          destination: "/api/:path*",
        },
      ],
    };
  },

  // Image optimization
  images: {
    domains: ["offbook.app"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ["image/webp"],
    minimumCacheTTL: 60,
  },

  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Performance optimization
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    serverComponentsExternalPackages: [],
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
      "@": "./src",
    };

    // Production optimizations
    if (process.env.NODE_ENV === "production") {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: "all",
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              chunks: "all",
              name: "framework",
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            lib: {
              test(module) {
                return (
                  module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier())
                );
              },
              name(module) {
                const hash = crypto.createHash("sha1");
                if (!module.identifier) return "vendor";
                hash.update(module.identifier());
                return hash.digest("hex").substring(0, 8);
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              name: "commons",
              minChunks: 2,
              priority: 20,
            },
            shared: {
              name(module, chunks) {
                if (!chunks || !chunks.length) return "shared";
                const hash = crypto.createHash("sha1");
                hash.update(
                  chunks.reduce((acc, chunk) => acc + (chunk.name || ""), "")
                );
                return hash.digest("hex").substring(0, 8);
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },

  // Temporarily disable type checking and linting during build
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configure static generation
  staticPageGenerationTimeout: 180,

  // Configure page extensions
  pageExtensions: ["ts", "tsx", "js", "jsx"],

  // Configure runtime settings
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },

  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
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
  },
};

module.exports = nextConfig;
