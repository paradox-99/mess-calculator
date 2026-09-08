import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Enables `forbidden()` and the app/forbidden.tsx page, which stand in for
    // Django's PermissionDenied / handler403.
    authInterrupts: true,
  },
};

export default nextConfig;
