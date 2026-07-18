import type { NextConfig } from "next";

// Sub-path deployment (e.g. devnovate.co/submit-event). Empty by default so
// the app runs at the root locally. Must be a path starting with "/" or unset
// — `basePath` rejects an empty string, hence `|| undefined`. See
// src/lib/base-path.ts for how the same value flows to client fetches/images.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  basePath,
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  // Native addons (better-sqlite3's .node binding) can't be bundled by the
  // JS bundler — keep them external and required from node_modules at runtime.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
