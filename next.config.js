/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  experimental: { serverActions: { bodySizeLimit: '4mb' } }
};
module.exports = nextConfig;
