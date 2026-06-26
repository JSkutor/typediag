/**
 * Ensures the Vitest-only PostgreSQL database exists.
 * Usage: npx tsx scripts/ensureTestDatabase.ts
 */

import postgres from "postgres";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://typediag:typediag@localhost:5432/typediag_test";

function adminConnectionString(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

function databaseName(databaseUrl: string): string {
  return new URL(databaseUrl).pathname.replace(/^\//, "");
}

async function main() {
  const testDbName = databaseName(TEST_DATABASE_URL);
  const admin = postgres(adminConnectionString(TEST_DATABASE_URL));

  const existing = await admin`
    SELECT 1 FROM pg_database WHERE datname = ${testDbName}
  `;

  if (existing.length === 0) {
    if (!/^[a-zA-Z0-9_]+$/.test(testDbName)) {
      throw new Error(`Unsafe test database name: ${testDbName}`);
    }
    await admin.unsafe(`CREATE DATABASE ${testDbName}`);
    console.log(`Created database: ${testDbName}`);
  } else {
    console.log(`Database already exists: ${testDbName}`);
  }

  await admin.end();

  const testDb = postgres(TEST_DATABASE_URL);
  await testDb`CREATE EXTENSION IF NOT EXISTS vector`;
  await testDb`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE`;
  await testDb.end();
  console.log(`Extensions ready on: ${testDbName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
