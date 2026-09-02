import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev blocks /_next assets from any host that isn't localhost.
  // Phones on the same Wi-Fi hit http://192.168.x.x:3000, so Clerk's
  // client bundle 403s and the sign-in card never mounts. Dev-only.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
