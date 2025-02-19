import { createHash } from "crypto";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,

  // Configure server components and static optimization
  experimental: {
    serverActions: true,
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              process.env.NODE_ENV === "development"
                ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                  "font-src 'self' data: https://fonts.gstatic.com; " +
                  "img-src 'self' data: blob: https:; " +
                  "media-src 'self' blob: https:; " +
                  "connect-src 'self' https: ws: wss: data:; " +
                  "frame-src 'self' https:; " +
                  "worker-src 'self' blob:;"
                : "default-src 'self'; " +
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                  "font-src 'self' data: https://fonts.gstatic.com; " +
                  "img-src 'self' data: https:; " +
                  "media-src 'self' https:; " +
                  "connect-src 'self' https:; " +
                  "frame-src 'self';",
          },
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
    ];
  },

  // Image optimization
  images: {
    unoptimized: true,
  },

  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
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

    return config;
  },

  // Disable favicon route generation
  generateEtags: false,
  generateBuildId: false,

  // Route handling
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/public/favicon.ico",
      },
    ];
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
};

export default nextConfig;
