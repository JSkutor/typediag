import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sql, and, inArray, isNull, or, like, eq } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { targetTexts, runs } from "@/db/schema";
import { db } from "./db";
import crypto from "crypto";

describe("db", () => {
  let testUserId: string;

  beforeEach(async () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    const user = await db.getOrCreateUserByClerkId("test_clerk_id");
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up runs created during tests (cascades to pages and key_events)
    if (testUserId) {
      await drizzleDb.delete(runs).where(eq(runs.userId, testUserId));
    }
    // Clean up temporary target_texts created during tests
    await drizzleDb
      .delete(targetTexts)
      .where(
        or(
          like(targetTexts.id, "test-%"),
          like(targetTexts.id, "target_gen_%"),
          like(targetTexts.content, "no-embed-%"),
          like(targetTexts.content, "with-embed-%"),
          like(targetTexts.content, "topic-gen-%"),
          like(targetTexts.content, "topic-dup-%"),
          like(targetTexts.content, "test-content-%"),
        ),
      );
  });

  it("should create and update a run correctly", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "pending",
      started_at: "2026-06-15T00:00:00Z",
    });

    expect(run.status).toBe("pending");
    expect(run.finishedAt).toBeNull();

    const updated = await db.updateRun(run.id, { status: "in_progress" });
    expect(updated.status).toBe("in_progress");

    const fetched = await db.getRun(run.id);
    expect(fetched?.status).toBe("in_progress");
  });

  it("should finalize a run correctly with no pages", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    const finalized = await db.finalizeRun(run.id);
    expect(finalized?.status).toBe("completed");
    expect(finalized?.cpm).toBe(0);
    expect(finalized?.wpm).toBe(0);
    expect(finalized?.accuracy).toBe(100);
  });

  it("should finalize a run correctly with pages", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    await db.createPage({
      id: "00000000-0000-0000-0000-000000000021",
      run_id: run.id,
      target_text_id: null,
      order_index: 0,
      language: "ko",
      typed_text: "test",
      wpm: 100,
      cpm: 500,
      accuracy: 95,
      started_at: "2026-06-15T00:00:10Z",
      finished_at: "2026-06-15T00:00:20Z",
      elapsed_time_ms: 10000,
      key_events: [],
    });

    await db.createPage({
      id: "00000000-0000-0000-0000-000000000022",
      run_id: run.id,
      target_text_id: null,
      order_index: 1,
      language: "ko",
      typed_text: "test2",
      wpm: 80,
      cpm: 400,
      accuracy: 90,
      started_at: "2026-06-15T00:00:25Z",
      finished_at: "2026-06-15T00:00:35Z",
      elapsed_time_ms: 10000,
      key_events: [],
    });

    const finalized = await db.finalizeRun(run.id);
    expect(finalized?.status).toBe("completed");
    expect(finalized?.wpm).toBe(90); // (100 + 80) / 2
    expect(finalized?.cpm).toBe(450); // (500 + 400) / 2
    expect(finalized?.accuracy).toBe(92.5); // (95 + 90) / 2
  });

  it("should finalize a run correctly using weighted averages for pages with different lengths and durations", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    // Page 1: 1000ms (1s), 600 CPM, 120 WPM, 100% accuracy, 10 key events
    await db.createPage({
      id: "00000000-0000-0000-0000-000000000023",
      run_id: run.id,
      target_text_id: null,
      order_index: 0,
      language: "ko",
      typed_text: "short",
      wpm: 120,
      cpm: 600,
      accuracy: 100,
      started_at: "2026-06-15T00:00:10Z",
      finished_at: "2026-06-15T00:00:11Z",
      elapsed_time_ms: 1000,
      key_events: Array.from({ length: 10 }, () => ({
        from_key: "a",
        to_key: "b",
        key_char: "b",
        latency: 100,
        hold_duration_ms: 50,
        is_correct: true,
        expected_char: "b",
      })),
    });

    // Page 2: 9000ms (9s), 400 CPM, 80 WPM, 90% accuracy, 90 key events
    await db.createPage({
      id: "00000000-0000-0000-0000-000000000024",
      run_id: run.id,
      target_text_id: null,
      order_index: 1,
      language: "ko",
      typed_text: "longer",
      wpm: 80,
      cpm: 400,
      accuracy: 90,
      started_at: "2026-06-15T00:00:20Z",
      finished_at: "2026-06-15T00:00:29Z",
      elapsed_time_ms: 9000,
      key_events: Array.from({ length: 90 }, (_, i) => ({
        from_key: "a",
        to_key: "b",
        key_char: "b",
        latency: 100,
        hold_duration_ms: 50,
        is_correct: i >= 9,
        expected_char: "b",
      })),
    });

    const finalized = await db.finalizeRun(run.id);
    expect(finalized?.status).toBe("completed");

    // Total time = 10000ms
    // Weighted CPM = (600 * 1000 + 400 * 9000) / 10000 = 420
    // Weighted WPM = (120 * 1000 + 80 * 9000) / 10000 = 84
    expect(finalized?.cpm).toBe(420);
    expect(finalized?.wpm).toBe(84);

    // Total keystrokes = 10 + 90 = 100
    // Page 1: 10 * 100% = 1000
    // Page 2: 90 * 90% = 8100
    // Weighted accuracy = (1000 + 8100) / 100 = 91%
    expect(finalized?.accuracy).toBe(91);
  });

  it("syncSessionOnMount should delete a pending run", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "pending",
      started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    });

    await db.syncSessionOnMount(testUserId);

    const fetched = await db.getRun(run.id);
    expect(fetched).toBeNull();
  });

  it("syncSessionOnMount should finalize an in_progress run if idle for > 3 mins", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 mins ago
    });

    await db.syncSessionOnMount(testUserId);

    const fetched = await db.getRun(run.id);
    expect(fetched?.status).toBe("completed");
  });

  it("syncSessionOnMount should not finalize an in_progress run if active within 3 mins", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 mins ago
    });

    await db.syncSessionOnMount(testUserId);

    const fetched = await db.getRun(run.id);
    expect(fetched?.status).toBe("in_progress");
  });

  it("should return target texts and find specific ones", async () => {
    const targetTextId = `test-tgt-${crypto.randomUUID().slice(0, 8)}`;
    const content = `test-content-${crypto.randomUUID()}`;

    await drizzleDb.insert(targetTexts).values({
      id: targetTextId,
      content,
      language: "ko",
      source: "default",
      userId: testUserId,
    });

    const all = await db.getTargetTexts();
    expect(all.some((t) => t.id === targetTextId)).toBe(true);

    const foundById = await db.findTargetText({ id: targetTextId });
    expect(foundById?.content).toBe(content);

    const foundByContent = await db.findTargetText({ content });
    expect(foundByContent?.id).toBe(targetTextId);
  });

  it("should default target_text_id to null if it does not exist in DB when creating a page", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    const page = await db.createPage({
      run_id: run.id,
      target_text_id: "non-existent-id",
      order_index: 0,
      language: "ko",
      typed_text: "test",
      wpm: 100,
      cpm: 500,
      accuracy: 95,
      started_at: "2026-06-15T00:00:10Z",
      finished_at: "2026-06-15T00:00:20Z",
      elapsed_time_ms: 10000,
      key_events: [],
    });

    expect(page.targetTextId).toBeNull();
  });

  it("should successfully bulk insert pages with > 500 key events", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    const numEvents = 550;
    const page = await db.createPage({
      run_id: run.id,
      target_text_id: null,
      order_index: 0,
      language: "ko",
      typed_text: "test",
      wpm: 100,
      cpm: 500,
      accuracy: 95,
      started_at: "2026-06-15T00:00:10Z",
      finished_at: "2026-06-15T00:00:20Z",
      elapsed_time_ms: 10000,
      key_events: Array.from({ length: numEvents }, (_, i) => ({
        from_key: "a",
        to_key: "b",
        key_char: "b",
        latency: 10,
        hold_duration_ms: null,
        is_correct: true,
        expected_char: "b",
      })),
    });

    const fetchedEvents = await db.getKeyEventsForPage(page.id);
    expect(fetchedEvents).toHaveLength(numEvents);
  });

  it("should truncate oversized key event fields before insert", async () => {
    const run = await db.createRun({
      user_id: testUserId,
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    const longFromKey = "a".repeat(30);
    const longToKey = "b".repeat(30);
    const longKeyChar = "c".repeat(15);
    const longExpected = "d".repeat(15);

    const page = await db.createPage({
      run_id: run.id,
      target_text_id: null,
      order_index: 0,
      language: "ko",
      typed_text: "test",
      wpm: 100,
      cpm: 500,
      accuracy: 95,
      started_at: "2026-06-15T00:00:10Z",
      finished_at: "2026-06-15T00:00:20Z",
      elapsed_time_ms: 10000,
      key_events: [
        {
          from_key: longFromKey,
          to_key: longToKey,
          key_char: longKeyChar,
          latency: 123.7,
          hold_duration_ms: 45.8,
          is_correct: true,
          expected_char: longExpected,
        },
      ],
    });

    const [event] = await db.getKeyEventsForPage(page.id);
    expect(event.fromKey).toHaveLength(20);
    expect(event.toKey).toHaveLength(20);
    expect(event.keyChar).toHaveLength(10);
    expect(event.expectedChar).toHaveLength(10);
    expect(event.latency).toBe(124);
    expect(event.holdDurationMs).toBe(46);
  });

  it("should insert topic-generated targets without embedding", async () => {
    const id = `target_gen_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const content = `topic-gen-${crypto.randomUUID()}`;

    await db.insertTopicGeneratedTargets([{ id, content, language: "ko", topic: "테스트 주제" }]);

    const found = await db.findTargetText({ id });
    expect(found?.content).toBe(content);
    expect(found?.source).toBe("topic");
    expect(found?.generatorModel).toBe("gemini-2.5-flash-lite");
    expect(found?.topic).toBe("테스트 주제");
    expect(found?.embedding).toBeNull();
  });

  it("should skip duplicate content when inserting topic-generated targets", async () => {
    const content = `topic-dup-${crypto.randomUUID()}`;
    const firstId = `target_gen_${Date.now()}_aaaa1111`;
    const secondId = `target_gen_${Date.now()}_bbbb2222`;

    await db.insertTopicGeneratedTargets([
      { id: firstId, content, language: "ko", topic: "주제A" },
    ]);
    await db.insertTopicGeneratedTargets([
      { id: secondId, content, language: "ko", topic: "주제B" },
    ]);

    expect(await db.findTargetText({ id: secondId })).toBeNull();
    expect((await db.findTargetText({ content }))?.id).toBe(firstId);
  });

  it("should select only target texts with null embedding for batch embed", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const noEmbedId = `test-no-embed-${suffix}`;
    const withEmbedId = `test-with-embed-${suffix}`;
    const zeroVector = `[${new Array(4096).fill(0).join(",")}]`;

    await drizzleDb.insert(targetTexts).values([
      {
        id: noEmbedId,
        content: `no-embed-${suffix}`,
        language: "ko",
        source: "default",
      },
      {
        id: withEmbedId,
        content: `with-embed-${suffix}`,
        language: "ko",
        source: "default",
      },
    ]);

    await drizzleDb.execute(
      sql.raw(
        `UPDATE target_texts SET embedding = '${zeroVector}'::vector WHERE id = '${withEmbedId}'`,
      ),
    );

    const pending = await drizzleDb
      .select({ id: targetTexts.id })
      .from(targetTexts)
      .where(and(inArray(targetTexts.id, [noEmbedId, withEmbedId]), isNull(targetTexts.embedding)));

    expect(pending.map((row) => row.id)).toEqual([noEmbedId]);
  });
});
