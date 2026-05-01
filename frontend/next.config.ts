import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AUTH_GUARD_ENABLED: process.env.AUTH_GUARD_ENABLED,
  },
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 200,
        ignored: ["**/.next/**", "**/node_modules/**"],
        poll: 1000,
      };
    }

    return config;
  },
};

export default nextConfig;
