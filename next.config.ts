import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Note: The Next.js dev indicator (icon in bottom corner) is a built-in development feature
  // It automatically disappears in production builds (npm run build && npm start)
  // There's no way to completely disable it in dev mode, but it won't appear for end users
};

export default nextConfig;
