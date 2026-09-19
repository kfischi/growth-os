import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    // Tenant resolution depends on the incoming Host header, so the shell is
    // always rendered per-request rather than served from a static shell.
    staleTimes: { dynamic: 0, static: 30 },
  },
};

export default nextConfig;
