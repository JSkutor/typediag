/**
 * Database connection singleton for Drizzle ORM.
 * Uses the `pg` (node-postgres) driver.
 *
 * Deployed on Cloudflare Pages with Node.js Workers runtime
 * (no Edge Runtime) so node-postgres TCP connections work fine.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV === "test"
    ? "postgresql://typediag:typediag@localhost:5432/typediag_test"
    : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

// node-postgres connection pool
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
});

export const drizzleDb = drizzle(pool, { schema });

