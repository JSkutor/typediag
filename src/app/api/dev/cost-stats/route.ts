
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { drizzleDb } from "@/db";
import { targetTexts } from "@/db/schema";
import { estimateKbPerPageFromDb } from "@/lib/dev/costSimulation";

interface BatchMetadata {
  request_count?: number;
  job_id?: string;
  submitted_at?: string;
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let batchMetadata: BatchMetadata | null = null;
  if (process.env.NEXT_RUNTIME !== "edge") {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const raw = await fs.readFile(
        path.join(process.cwd(), "scripts", "data", "batch_metadata.json"),
        "utf-8",
      );
      batchMetadata = JSON.parse(raw) as BatchMetadata;
    } catch {
      batchMetadata = null;
    }
  }

  try {
    const [corpusRow] = await drizzleDb
      .select({
        total: sql<number>`count(*)::int`,
        embedded: sql<number>`count(${targetTexts.embedding})::int`,
        topicSource: sql<number>`count(*) filter (where ${targetTexts.source} = 'topic')::int`,
        batchSource: sql<number>`count(*) filter (where ${targetTexts.source} != 'topic')::int`,
        distinctTopics: sql<number>`count(distinct ${targetTexts.topic}) filter (where ${targetTexts.topic} is not null)::int`,
      })
      .from(targetTexts);

    const usageResult = await drizzleDb.execute(sql`
      SELECT
        (SELECT count(*)::int FROM pages) AS page_count,
        (SELECT count(*)::int FROM key_events) AS key_event_count,
        (SELECT count(*)::int FROM runs) AS run_count,
        (SELECT count(*)::int FROM pages WHERE created_at > now() - interval '30 days') AS pages_last_30d,
        pg_database_size(current_database())::bigint AS database_bytes,
        pg_total_relation_size('pages')::bigint AS pages_bytes,
        pg_total_relation_size('key_events')::bigint AS key_events_bytes,
        pg_total_relation_size('runs')::bigint AS runs_bytes,
        pg_total_relation_size('target_texts')::bigint AS target_texts_bytes
    `);

    let row: Record<string, unknown> | undefined;
    if (usageResult && typeof usageResult === 'object') {
      if ('rows' in usageResult && Array.isArray((usageResult as unknown as Record<string, unknown>).rows)) {
        row = (usageResult as unknown as Record<string, unknown[]>).rows[0] as Record<string, unknown> | undefined;
      } else if (Array.isArray(usageResult)) {
        row = usageResult[0] as Record<string, unknown> | undefined;
      }
    }

    const databaseBytes = Number(row?.database_bytes ?? 0);
    const pageCount = Number(row?.page_count ?? 0);
    const sessionDataBytes =
      Number(row?.pages_bytes ?? 0) +
      Number(row?.key_events_bytes ?? 0) +
      Number(row?.runs_bytes ?? 0);
    const kbPerPageEstimate = estimateKbPerPageFromDb(sessionDataBytes, pageCount);
    const pagesLast30d = Number(row?.pages_last_30d ?? 0);
    const sessionDataGb = sessionDataBytes / (1024 * 1024 * 1024);
    const growthGbPer30d =
      pagesLast30d > 0 && kbPerPageEstimate != null
        ? (pagesLast30d * kbPerPageEstimate) / (1024 * 1024)
        : null;

    return NextResponse.json({
      /** All rows in target_texts (practice sentences). */
      total: corpusRow?.total ?? 0,
      /** Rows searchable in Topic Mode (embedding IS NOT NULL). */
      embedded: corpusRow?.embedded ?? 0,
      topicSource: corpusRow?.topicSource ?? 0,
      /** source != 'topic' — batch / seed corpus */
      batchSource: corpusRow?.batchSource ?? 0,
      distinctTopics: corpusRow?.distinctTopics ?? 0,
      similarityThreshold: 0.5,
      batchMetadata,
      disk: {
        databaseGb: databaseBytes / (1024 * 1024 * 1024),
        databaseBytes,
        pagesBytes: Number(row?.pages_bytes ?? 0),
        keyEventsBytes: Number(row?.key_events_bytes ?? 0),
        runsBytes: Number(row?.runs_bytes ?? 0),
        targetTextsBytes: Number(row?.target_texts_bytes ?? 0),
        sessionDataGb,
      },
      usage: {
        pageCount,
        keyEventCount: row?.key_event_count ?? 0,
        runCount: row?.run_count ?? 0,
        pagesLast30d,
        kbPerPageEstimate,
        growthGbPer30d,
      },
      glossary: {
        targetTexts:
          "제시문 1행 = 타자 연습 문장 1개. Batch API 1요청 → 1행. Topic generate 1회 → 20행.",
        pages: "유저가 문장 1개를 끝까지 친 완주 기록 (세션 데이터). 캐시 코퍼스와 별개.",
        embedded: "embedding IS NOT NULL — 벡터 검색에 쓰이는 행 수.",
        databaseGb: "pg_database_size — OCI Free 200 GB cap 비교용.",
        kbPerPageEstimate: "pages+key_events+runs 바이트 ÷ page 수.",
      },
    });
  } catch (error) {
    console.error("[dev/cost-stats]", error);
    return NextResponse.json(
      {
        error: "Database unavailable. Run db:up && db:push && db:seed.",
        batchMetadata,
      },
      { status: 503 },
    );
  }
}
