const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Esta es la línea que soluciona el warning del workspace
  outputFileTracingRoot: path.join(__dirname),

  experimental: {
    serverActions: { 
      bodySizeLimit: '4mb' 
    }
  }
};

module.exports = nextConfig;