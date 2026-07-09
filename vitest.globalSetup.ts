import { execSync } from "node:child_process";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://typediag:typediag@localhost:5432/typediag_test";

export default async function globalSetup() {
  execSync("npx tsx scripts/ensureTestDatabase.ts", {
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_DATABASE_URL,
    },
  });

  const devDatabaseUrl = process.env.DEV_DATABASE_URL;
  if (devDatabaseUrl && devDatabaseUrl !== TEST_DATABASE_URL) {
    execSync(`npx tsx scripts/cleanupTestUsers.ts "${devDatabaseUrl}"`, {
      stdio: "inherit",
      env: process.env,
    });
  }
}
