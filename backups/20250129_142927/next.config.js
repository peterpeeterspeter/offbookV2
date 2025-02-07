/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['daily.co'],
  },
  env: {
    NEXT_PUBLIC_DAILY_ROOM_URL: process.env.NEXT_PUBLIC_DAILY_ROOM_URL,
  },
  webpack: (config, { isServer }) => {
    // Audio worklet support
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'audio-worklet': false,
    };

    return config;
  },
  experimental: {
    // Enable streaming features
    serverActions: true,
    serverComponents: true,
  },
} 