import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // experimental: {
  //   // Turbopack's on-disk dev cache compacts in the background and spikes memory on this machine.
  //   turbopackFileSystemCacheForDev: false,
  // },
  allowedDevOrigins: ["localhost", "10.228.45.221","10.223.20.221", "172.20.173.165", "192.168.1.4", "192.168.0.102", "192.168.0.104", "192.168.0.105", "https://f5sthhpt-3000.inc1.devtunnels.ms"],
};

export default nextConfig;
