import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls to NestJS backend
  async rewrites() {
    return [
      {
        source: "/nest/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/:path*`,
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001"],
    },
  },
};

export default nextConfig;
