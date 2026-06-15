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

  it("syncSessionOnMount should finalize an in_progress run if idle for > 5 mins", async () => {
    const run = await db.createRun({
      id: "run_5",
      user_id: "user_001",
      status: "in_progress",
      started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    });

    await db.syncSessionOnMount();

    const fetched = await db.getRun(run.id);
    expect(fetched?.status).toBe("completed");
  });

  it("syncSessionOnMount should not finalize an in_progress run if active within 5 mins", async () => {
    const run = await db.createRun({
      id: "run_6",
      user_id: "user_001",
      status: "in_progress",
      started_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 mins ago
    });

    await db.syncSessionOnMount();

    const fetched = await db.getRun(run.id);
    expect(fetched?.status).toBe("in_progress");
  });
});
