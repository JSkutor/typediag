import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { drizzleDb } from "@/db";
import { keyEvents, pages, runs } from "@/db/schema";

beforeEach(async () => {
  try {
    // Clean up database tables for test isolation
    await drizzleDb.delete(keyEvents);
    await drizzleDb.delete(pages);
    await drizzleDb.delete(runs);
  } catch (err) {
    console.error("Failed to clean up database in global beforeEach:", err);
  }
});
