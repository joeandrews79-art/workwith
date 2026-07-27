import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Screenshot uploads (base64) to the meeting-vision server action can exceed
    // the 1MB default; images are resized client-side but allow headroom.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
