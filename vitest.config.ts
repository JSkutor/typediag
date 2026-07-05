import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://typediag:typediag@localhost:5432/typediag_test";

// Preserve dev DB URL for orphan/test user cleanup in globalSetup
if (process.env.DATABASE_URL && !process.env.DEV_DATABASE_URL) {
  process.env.DEV_DATABASE_URL = process.env.DATABASE_URL;
}

// Never run Vitest cleanup against the dev DATABASE_URL from .env.local
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.VITEST = "true";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    globalSetup: ["./vitest.globalSetup.ts"],
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
