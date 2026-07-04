import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Alias Node.js native modules to false for the Webpack compilation.
      // This prevents build errors during Next.js static generation (Collecting page data).
      config.resolve.alias = {
        ...config.resolve.alias,
        "node:util/types": false,
        "node:util": false,
        "util/types": false,
        "util": false,
        net: false,
        tls: false,
        dns: false,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        string_decoder: false,
        "pg-native": false,
      };
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      "node:util/types": "./src/utils/empty.ts",
      "node:util": "./src/utils/empty.ts",
      "fs/promises": "./src/utils/empty.ts",
      net: "./src/utils/empty.ts",
      tls: "./src/utils/empty.ts",
      dns: "./src/utils/empty.ts",
      fs: "./src/utils/empty.ts",
      // path는 posthog-node 등 서버 패키지가 실제로 사용하므로 alias 금지
    },
  },
};

export default nextConfig;
