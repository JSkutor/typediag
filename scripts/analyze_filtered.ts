import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.dirname(__dirname);
const DATA_DIR = path.join(PROJECT_ROOT, "scripts", "data");
const OUTPUT_JSONL = path.join(DATA_DIR, "batch_output.jsonl");

function getPureHangulCount(text: string) {
  const hangulChars = text.match(/[가-힣]/g) || [];
  return hangulChars.length;
}

function cleanSentence(text: string) {
  if (!text) return "";
  let cleaned = text.replace(/['"`‘’“”]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned.trim();
}

async function main() {
  if (!fs.existsSync(OUTPUT_JSONL)) {
    console.error("batch_output.jsonl not found.");
    return;
  }

  const lines = fs.readFileSync(OUTPUT_JSONL, "utf-8").split("\n");

  let total = 0;
  const filteredLength: string[] = [];
  const filteredQuotes: string[] = [];
  const filteredChars: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const result = JSON.parse(line);
      if (!result.response) continue;

      total++;
      const responseText = result.response.candidates[0].content.parts[0].text;
      const contentData = JSON.parse(responseText);
      const rawContent = contentData.content || "";

      const content = cleanSentence(rawContent);
      const hangulCnt = getPureHangulCount(content);

      // 1. Length Filter
      if (hangulCnt < 50 || hangulCnt > 110) {
        filteredLength.push("Length " + hangulCnt + ": " + rawContent);
        continue;
      }

      // 2. Quotes Filter (If raw content contains quotes)
      if (/['"`‘’“”]/.test(rawContent)) {
        filteredQuotes.push(rawContent);
        continue;
      }

      // 3. Special characters filter
      if (!/^[가-힣0-9\s.,!?]+$/.test(content)) {
        filteredChars.push(content);
        continue;
      }
    } catch (e) {
      // ignore
    }
  }

  console.log("Total parsed: " + total);
  console.log("Filtered by Length: " + filteredLength.length);
  console.log("Length failures examples:");
  filteredLength.slice(0, 5).forEach((x) => console.log(" - " + x));

  console.log("Filtered by Quotes: " + filteredQuotes.length);
  console.log("Quotes failures examples:");
  filteredQuotes.slice(0, 5).forEach((x) => console.log(" - " + x));

  console.log("Filtered by invalid chars: " + filteredChars.length);
  console.log("Char failures examples:");
  filteredChars.slice(0, 5).forEach((x) => console.log(" - " + x));
}

main();
