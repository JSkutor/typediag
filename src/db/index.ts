/**
 * Database connection singleton for Drizzle ORM.
 * Uses the `postgres` driver (postgres.js).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV === "test"
    ? "postgresql://typediag:typediag@localhost:5432/typediag"
    : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

// postgres.js client — connection pool
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const drizzleDb = drizzle(client, { schema });
