/**
 * Clear all tables in the TypeDiag database.
 * Usage: npx tsx --env-file=.env.local scripts/clearDatabase.ts
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Check your .env.local file.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function main() {
  console.log("⚠️  Attempting to clear all tables in the database...");

  try {
    // Truncate tables with CASCADE to handle foreign keys, and reset sequence identifiers
    await sql`
      TRUNCATE TABLE key_events, pages, runs, target_texts, topic_usage_limits, user_feedbacks, users RESTART IDENTITY CASCADE
    `;
    console.log("   ✅ All tables truncated successfully!");
  } catch (err) {
    console.error("❌ Failed to truncate tables:", err);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
