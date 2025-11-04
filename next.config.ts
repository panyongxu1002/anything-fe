import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Ignore React Native dependencies (for MetaMask SDK in browser)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    // Handle Solana toolkit compatibility issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'fs': false,
      'path': false,
      'crypto': false,
    };

    return config;
  },
  
  // Ensure API routes can handle custom headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Payment, X-Payment-Response' },
          { key: 'Access-Control-Expose-Headers', value: 'X-Payment-Response' },
        ],
      },
    ];
  },
};

export default nextConfig;
