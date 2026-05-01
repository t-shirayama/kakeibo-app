import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
