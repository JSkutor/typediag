import { describe, it, expect, beforeEach } from "vitest";
import { db, RunRow, PageRow } from "./db";

describe("db", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("should create and update a run correctly", async () => {
    const run = await db.createRun({
      id: "run_1",
      user_id: "user_001",
      status: "pending",
      started_at: "2026-06-15T00:00:00Z",
    });

    expect(run.status).toBe("pending");
    expect(run.finished_at).toBeNull();

    const updated = await db.updateRun("run_1", { status: "in_progress" });
    expect(updated.status).toBe("in_progress");

    const fetched = await db.getRun("run_1");
    expect(fetched?.status).toBe("in_progress");
  });

  it("should finalize a run correctly with no pages", async () => {
    await db.createRun({
      id: "run_2",
      user_id: "user_001",
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    const finalized = await db.finalizeRun("run_2");
    expect(finalized?.status).toBe("completed");
    expect(finalized?.cpm).toBe(0);
    expect(finalized?.wpm).toBe(0);
    expect(finalized?.accuracy).toBe(100);
  });

  it("should finalize a run correctly with pages", async () => {
    await db.createRun({
      id: "run_3",
      user_id: "user_001",
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    await db.createPage({
      id: "page_1",
      run_id: "run_3",
      target_text_id: "target_1",
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
      id: "page_2",
      run_id: "run_3",
      target_text_id: "target_2",
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

    const finalized = await db.finalizeRun("run_3");
    expect(finalized?.status).toBe("completed");
    expect(finalized?.wpm).toBe(90); // (100 + 80) / 2
    expect(finalized?.cpm).toBe(450); // (500 + 400) / 2
    expect(finalized?.accuracy).toBe(92.5); // (95 + 90) / 2
  });

  it("should finalize a run correctly using weighted averages for pages with different lengths and durations", async () => {
    await db.createRun({
      id: "run_weighted",
      user_id: "user_001",
      status: "in_progress",
      started_at: "2026-06-15T00:00:00Z",
    });

    // Page 1: 1000ms (1s), 600 CPM, 120 WPM, 100% accuracy, 10 key events
    await db.createPage({
      id: "page_w1",
      run_id: "run_weighted",
      target_text_id: "target_1",
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
        from_key: "a", to_key: "b", key_char: "b", latency: 100, hold_duration_ms: 50, is_correct: true, expected_char: "b"
      })),
    });

    // Page 2: 9000ms (9s), 400 CPM, 80 WPM, 90% accuracy, 90 key events
    await db.createPage({
      id: "page_w2",
      run_id: "run_weighted",
      target_text_id: "target_2",
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
        from_key: "a", to_key: "b", key_char: "b", latency: 100, hold_duration_ms: 50, is_correct: i >= 9, expected_char: "b"
      })),
    });

    const finalized = await db.finalizeRun("run_weighted");
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
      id: "run_4",
      user_id: "user_001",
      status: "pending",
      started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    });

    await db.syncSessionOnMount();

    const fetched = await db.getRun(run.id);
    expect(fetched).toBeNull();
  });

  it("syncSessionOnMount should finalize an in_progress run if idle for > 3 mins", async () => {
    const run = await db.createRun({
      id: "run_5",
      user_id: "user_001",
      status: "in_progress",
      started_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 mins ago
    });

    await db.syncSessionOnMount();

    const fetched = await db.getRun(run.id);
    expect(fetched?.status).toBe("completed");
  });

  it("syncSessionOnMount should not finalize an in_progress run if active within 3 mins", async () => {
    const run = await db.createRun({
      id: "run_6",
      user_id: "user_001",
      status: "in_progress",
      started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 mins ago
    });

    await db.syncSessionOnMount();

    const fetched = await db.getRun(run.id);
    expect(fetched?.status).toBe("in_progress");
  });
});
