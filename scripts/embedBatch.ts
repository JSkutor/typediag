/**
 * Batch embedding script for TypeDiag target_texts.
 *
 * Usage: npx tsx --env-file=.env.local scripts/embedBatch.ts
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
const UPSTAGE_API_KEY = process.env.UPSTAGE_API_KEY;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Check your .env.local file.");
  process.exit(1);
}

if (!UPSTAGE_API_KEY) {
  console.error("❌ UPSTAGE_API_KEY is not set. Check your .env.local file.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

interface TargetRow {
  id: string;
  content: string;
}

interface EmbeddingItem {
  index: number;
  embedding?: number[];
}

interface UpstageEmbeddingResponse {
  data: EmbeddingItem[];
}

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🚀 Starting batch embedding process...\n");

  const rows = await sql<TargetRow[]>`
    SELECT id, content FROM target_texts WHERE embedding IS NULL
  `;

  console.log(`Found ${rows.length} texts without embeddings.\n`);

  if (rows.length === 0) {
    console.log("🎉 All texts are already embedded!");
    await sql.end();
    process.exit(0);
  }

  if (dryRun) {
    console.log("Dry run — would embed the following rows:");
    for (const row of rows) {
      console.log(`  - ${row.id}`);
    }
    await sql.end();
    process.exit(0);
  }

  // Upstage API 한 번에 보낼 수 있는 적절한 크기 (토큰 수 제한 고려)
  const BATCH_SIZE = 50;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} (${batch.length} items)...`,
    );

    try {
      const contents = batch.map((r) => r.content);

      const res = await fetch("https://api.upstage.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${UPSTAGE_API_KEY}`,
        },
        body: JSON.stringify({
          input: contents,
          model: "embedding-passage",
        }),
      });

      if (!res.ok) {
        throw new Error(`Upstage API error: ${await res.text()}`);
      }

      const data = (await res.json()) as UpstageEmbeddingResponse;
      const embeddings = data.data;

      // 트랜잭션으로 DB 업데이트
      await sql.begin(async (tx) => {
        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const embeddingObj = embeddings.find((e) => e.index === j);

          if (embeddingObj?.embedding) {
            const arrStr = `[${embeddingObj.embedding.join(",")}]`;
            await tx`UPDATE target_texts SET embedding = ${arrStr}::vector WHERE id = ${row.id} AND embedding IS NULL`;
            successCount++;
          } else {
            failCount++;
          }
        }
      });
      console.log(`   ✅ Batch success`);
    } catch (err) {
      console.error(`   ❌ Batch failed:`, err);
      failCount += batch.length;
    }
  }

  console.log(`\n🎉 Batch embedding completed!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);

  await sql.end();
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
