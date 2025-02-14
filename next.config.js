/** @type {import('next').NextConfig} */
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
  },

  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Performance optimization
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  webpack: (config, { isServer }) => {
    // Audio worklet support
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "audio-worklet": false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      "@": "./src",
    };

    return config;
  },
};

module.exports = nextConfig;
