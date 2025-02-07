/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove invalid server config
  experimental: {
    turbo: true,
  },
};

module.exports = nextConfig;
