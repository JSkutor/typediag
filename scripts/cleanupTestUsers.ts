/**
 * Removes test and orphan guest users from a database.
 * Used by Vitest globalSetup (dev DB) and available as a manual script.
 *
 * Usage: npx tsx --env-file=.env.local scripts/cleanupTestUsers.ts
 */

import postgres from "postgres";

const databaseUrl = process.argv[2] ?? process.env.DEV_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL or DEV_DATABASE_URL is required.");
  process.exit(1);
}

async function main() {
  const sql = postgres(databaseUrl);

  const testIds = await sql<{ id: string }[]>`
    DELETE FROM users
    WHERE id IN ('test_clerk_id', 'test_mock_clerk_id')
       OR id LIKE 'test_%'
       OR id SIMILAR TO 'user_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    RETURNING id
  `;

  const orphanGuests = await sql<{ id: string }[]>`
    DELETE FROM users u
    WHERE u.id LIKE 'guest_%'
      AND NOT EXISTS (
        SELECT 1 FROM runs r WHERE r.user_id = u.id
      )
    RETURNING u.id
  `;

  console.log(
    `Removed ${testIds.length} test user(s) and ${orphanGuests.length} orphan guest user(s) from ${new URL(databaseUrl).pathname.replace(/^\//, "")}.`,
  );

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
