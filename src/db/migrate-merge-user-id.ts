/**
 * One-off migration: merge users.clerk_id into users.id (varchar PK).
 * Wipes all user-owned data as requested.
 *
 * Usage: npx tsx src/db/migrate-merge-user-id.ts
 */

import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function main() {
  console.log("Migrating users.id to clerk/external id (varchar PK)...\n");

  await sql`TRUNCATE key_events, pages, runs, target_texts, users CASCADE`;
  console.log("Truncated user-related tables");

  await sql`ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_user_id_users_id_fk`;
  await sql`ALTER TABLE target_texts DROP CONSTRAINT IF EXISTS target_texts_user_id_users_id_fk`;

  await sql`ALTER TABLE runs ALTER COLUMN user_id TYPE varchar(255) USING user_id::text`;
  await sql`ALTER TABLE target_texts ALTER COLUMN user_id TYPE varchar(255) USING user_id::text`;
  console.log("Updated FK column types on runs and target_texts");

  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey`;
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS clerk_id`;
  await sql`ALTER TABLE users ALTER COLUMN id DROP DEFAULT`;
  await sql`ALTER TABLE users ALTER COLUMN id TYPE varchar(255) USING id::text`;
  await sql`ALTER TABLE users ADD PRIMARY KEY (id)`;
  console.log("Merged users.id to varchar PK (clerk_id removed)");

  await sql`
    ALTER TABLE runs
    ADD CONSTRAINT runs_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  `;
  await sql`
    ALTER TABLE target_texts
    ADD CONSTRAINT target_texts_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  `;
  console.log("Recreated foreign keys");

  console.log("\nDone. Run npm run db:push to verify schema sync.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end());
