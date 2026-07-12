import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { drizzleDb } from "@/db";
import { pages, runs, users } from "@/db/schema";

function assertTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const dbName = new URL(databaseUrl).pathname.replace(/^\//, "").split("?")[0];

  if (dbName !== "typediag_test") {
    throw new Error(
      `Vitest refused to wipe session tables on "${dbName}". ` +
        `Expected typediag_test. Check vitest.config.ts DATABASE_URL override.`,
    );
  }
}

assertTestDatabase();

beforeEach(async () => {
  try {
    await drizzleDb.delete(pages);
    await drizzleDb.delete(runs);
    await drizzleDb.delete(users);
  } catch (err) {
    console.error("Failed to clean up database in global beforeEach:", err);
  }
});
