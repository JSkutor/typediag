/**
 * Seed script for TypeDiag database.
 *
 * 1. Enables pgvector extension
 * 2. Seeds target_texts from SQLite (scripts/data/targets.db)
 * 3. Converts key_events table to TimescaleDB Hypertable
 *
 * Usage: npx tsx src/db/seed.ts
 */

import postgres from "postgres";
import Database from "better-sqlite3";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Check your .env.local file.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

interface SqliteTargetRow {
  id: number;
  content: string;
  language: string;
  source: string;
  generator_model: string | null;
  topic: string | null;
  user_id: string | null;
  usage_count: number;
  last_used_at: string | null;
  embedding: string | null;
  created_at: string | null;
}

async function main() {
  console.log("🚀 Starting TypeDiag database seed...\n");

  // --- Step 1: Enable extensions ---
  console.log("📦 Enabling PostgreSQL extensions...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE`;
  console.log("   ✅ pgvector + timescaledb enabled\n");

  // --- Step 2: Seed target_texts from SQLite ---
  const sqlitePath = path.join(process.cwd(), "scripts", "data", "targets.db");
  console.log(`📖 Reading SQLite database: ${sqlitePath}`);

  let sqliteDb: Database.Database;
  try {
    sqliteDb = new Database(sqlitePath, { readonly: true });
  } catch (err) {
    console.error(`❌ Failed to open SQLite database: ${err}`);
    process.exit(1);
  }

  const rows = sqliteDb.prepare("SELECT * FROM target_texts").all() as SqliteTargetRow[];
  console.log(`   Found ${rows.length} target texts\n`);

  console.log("💾 Inserting target_texts into PostgreSQL...");
  let insertedCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await sql.begin(async (tx) => {
      for (const row of batch) {
        // Generate a stable text ID: "target_001", "target_002", ...
        const textId = `target_${String(row.id).padStart(3, "0")}`;

        // Parse embedding from JSON text to pgvector format
        let embeddingValue: string | null = null;
        if (row.embedding) {
          try {
            const arr = JSON.parse(row.embedding) as number[];
            embeddingValue = `[${arr.join(",")}]`;
          } catch {
            console.warn(`   ⚠️  Failed to parse embedding for id=${row.id}, skipping embedding`);
          }
        }

        await tx`
          INSERT INTO target_texts (id, content, language, source, generator_model, topic, usage_count, embedding, created_at)
          VALUES (
            ${textId},
            ${row.content},
            ${row.language},
            ${row.source || "default"},
            ${row.generator_model},
            ${row.topic},
            ${row.usage_count || 0},
            ${embeddingValue ? sql`${embeddingValue}::vector` : null},
            ${row.created_at ? new Date(row.created_at) : new Date()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        insertedCount++;
      }
    });

    process.stdout.write(`   Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
  }

  console.log(`\n   ✅ Inserted ${insertedCount} target texts\n`);
  sqliteDb.close();

  // --- Step 3: Convert key_events to Hypertable ---
  console.log("⏱️  Converting key_events to TimescaleDB Hypertable...");
  try {
    await sql`
      SELECT create_hypertable('key_events', 'created_at', if_not_exists => TRUE)
    `;
    console.log("   ✅ key_events is now a Hypertable\n");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already a hypertable")) {
      console.log("   ℹ️  key_events is already a Hypertable\n");
    } else {
      console.error(`   ❌ Failed to create hypertable: ${message}`);
    }
  }

  // --- Step 4: Verify ---
  console.log("🔍 Verifying...");
  const [countResult] = await sql`SELECT COUNT(*)::int as count FROM target_texts`;
  console.log(`   target_texts: ${countResult.count} rows`);

  const [embeddingCountResult] =
    await sql`SELECT COUNT(*)::int as count FROM target_texts WHERE embedding IS NOT NULL`;
  console.log(`   with embeddings: ${embeddingCountResult.count} rows`);

  console.log("\n🎉 Seed completed successfully!");
  await sql.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
