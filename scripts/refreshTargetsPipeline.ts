/**
 * Full Pipeline Script to Refresh Target Texts.
 * 
 * 1. Clears PostgreSQL database (using clearDatabase.ts)
 * 2. Deletes local SQLite DB and cached batch files
 * 3. Submits a new Gemini Batch API job for 1000 sentences
 * 4. Polls the batch job status until completion (successful download of batch_output.jsonl)
 * 5. Imports the results to SQLite DB (filtering & cleaning sentences)
 * 6. Generates Upstage Embeddings for SQLite entries
 * 7. Exports the entries to frontend JSON files (targets_client.json, targets_vector.json)
 * 8. Seeds the PostgreSQL database from SQLite (using seed.ts)
 * 
 * Usage: npx tsx --env-file=.env.local scripts/refreshTargetsPipeline.ts
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const PROJECT_ROOT = path.dirname(__dirname);
const DATA_DIR = path.join(PROJECT_ROOT, "scripts", "data");
const DB_FILE = path.join(DATA_DIR, "targets.db");
const METADATA_FILE = path.join(DATA_DIR, "batch_metadata.json");
const INPUT_JSONL = path.join(DATA_DIR, "batch_input.jsonl");
const OUTPUT_JSONL = path.join(DATA_DIR, "batch_output.jsonl");

function runCommand(command: string) {
  console.log(`\n⚙️ Running command: ${command}`);
  try {
    execSync(command, { stdio: "inherit", env: process.env });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== STARTING TARGET TEXT REFRESH PIPELINE ===");

  const skipBatch = process.argv.includes("--skip-batch");

  // --- Step 1: Clear local SQLite DB and cached batch files ---
  console.log("\n🧹 Cleaning up local SQLite DB and cached files...");
  // If skipBatch is true, we must preserve OUTPUT_JSONL
  const filesToDelete = skipBatch 
    ? [DB_FILE, METADATA_FILE, INPUT_JSONL]
    : [DB_FILE, METADATA_FILE, INPUT_JSONL, OUTPUT_JSONL];
    
  for (const file of filesToDelete) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`   Deleted: ${path.basename(file)}`);
    }
  }

  // --- Step 2: Clear PostgreSQL ---
  console.log("\n🧹 Truncating PostgreSQL tables...");
  runCommand("npx tsx scripts/clearDatabase.ts");

  if (!skipBatch) {
    // --- Step 3: Submit Gemini Batch API Job ---
    console.log("\n🚀 Submitting new Gemini Batch API job...");
    runCommand(".venv/bin/python3 scripts/generate_batch.py submit --count 1000");

    // --- Step 4: Poll Gemini Batch API Job Status ---
    console.log("\n⏱️ Polling Gemini Batch API job status...");
    let isDone = false;
    let attempts = 0;
    const POLL_INTERVAL_MS = 30000; // Check every 30 seconds

    while (!isDone) {
      attempts++;
      console.log(`\n[Attempt #${attempts}] Checking batch job status...`);
      
      try {
        // Run the check command which downloads the output on success
        execSync(".venv/bin/python3 scripts/generate_batch.py check", { stdio: "inherit", env: process.env });
        
        if (fs.existsSync(OUTPUT_JSONL)) {
          console.log("   ✅ Batch output file downloaded successfully!");
          isDone = true;
        } else {
          console.log(`   ⌛ Job still in progress. Waiting ${POLL_INTERVAL_MS / 1000} seconds...`);
          await sleep(POLL_INTERVAL_MS);
        }
      } catch (err) {
        console.error("   ⚠️ Check command encountered an error. Will retry in next interval...");
        await sleep(POLL_INTERVAL_MS);
      }
    }
  } else {
    console.log("\n⏭️ Skipping Gemini Batch API Job (using existing batch_output.jsonl)");
    if (!fs.existsSync(OUTPUT_JSONL)) {
      console.error(`❌ Error: batch_output.jsonl not found at ${OUTPUT_JSONL}. Cannot skip batch.`);
      process.exit(1);
    }
  }

  // --- Step 5: Import Batch Output to SQLite ---
  console.log("\n📥 Importing batch results into SQLite DB...");
  runCommand(".venv/bin/python3 scripts/manage_targets.py import");

  // --- Step 6: Generate Upstage Embeddings ---
  console.log("\n🧠 Generating Upstage Embeddings for SQLite DB entries...");
  runCommand(".venv/bin/python3 scripts/generate_embeddings.py");

  // --- Step 7: Export to JSON Files ---
  console.log("\n📤 Exporting DB to client/vector JSON files...");
  runCommand(".venv/bin/python3 scripts/manage_targets.py export");

  // --- Step 8: Seed PostgreSQL DB ---
  console.log("\n💾 Seeding PostgreSQL DB with new target texts and configuring tables...");
  runCommand("npx tsx src/db/seed.ts");

  console.log("\n===============================================");
  console.log("🎉 PIPELINE COMPLETED SUCCESSFULLY!");
  console.log("===============================================");
}

main().catch((err) => {
  console.error("\n❌ Pipeline failed:", err);
  process.exit(1);
});
