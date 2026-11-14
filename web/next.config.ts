import path from "node:path";
import { createRequire } from "node:module";
import type { NextConfig } from "next";

// Load local backend configuration in Next's startup process, outside the API
// module graph, so file tracing never packages server/.env into a function.
if (!process.env.VERCEL) {
  const requireFromServer = createRequire(path.resolve(process.cwd(), '../server/package.json'));
  requireFromServer('dotenv').config({ path: path.resolve(process.cwd(), '../server/.env') });
}

const nextConfig: NextConfig = {
  // The shared merchant module imports a native addon from the sibling package.
  // Resolve it at runtime from web/node_modules instead of bundling its installer.
  webpack(config, { isServer }) {
    if (isServer) {
      const existing = config.externals;
      config.externals = [
        { bcrypt: 'commonjs bcrypt' },
        ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
      ];
    }
    return config;
  },
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  outputFileTracingExcludes: {
    '/api/*': ['../server/.env*', '.env*'],
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    qualities: [75, 95],
  },
};

export default nextConfig;
