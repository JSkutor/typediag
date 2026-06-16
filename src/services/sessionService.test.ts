import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sessionService } from "./sessionService";
import { db } from "@/utils/db";

// Mock targets for targetText lookups
vi.mock("@/data/targets.json", () => ({
  default: [
    { id: "target_ko", content: "한글 텍스트", language: "ko" },
    { id: "target_en", content: "hello world", language: "en" }
  ]
}));

describe("SessionService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset localstorage (db)
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("startPage", () => {
    it("should create a new run if there is no previous run", async () => {
      const now = new Date("2026-06-16T10:00:00Z");
      const runId = await sessionService.startPage(now);
      
      const run = await db.getRun(runId);
      expect(run).toBeDefined();
      expect(run?.status).toBe("in_progress");
      expect(run?.started_at).toBe(now.toISOString());
    });

    it("should resume an existing pending run", async () => {
      const pendingTime = new Date("2026-06-16T10:00:00Z");
      const pendingRun = await db.createRun({
        id: "pending_run",
        user_id: "user_001",
        status: "pending",
        started_at: pendingTime.toISOString()
      });

      const now = new Date("2026-06-16T10:01:00Z");
      const runId = await sessionService.startPage(now);
      
      expect(runId).toBe(pendingRun.id);
      const run = await db.getRun(runId);
      expect(run?.status).toBe("in_progress");
      expect(run?.started_at).toBe(now.toISOString()); // updated started_at
    });

    it("should finalize an in_progress run and create new if older than 3 minutes", async () => {
      const pastTime = new Date("2026-06-16T10:00:00Z");
      const oldRun = await db.createRun({
        id: "old_run",
        user_id: "user_001",
        status: "in_progress",
        started_at: pastTime.toISOString()
      });

      const now = new Date("2026-06-16T10:04:00Z"); // 4 minutes later
      const runId = await sessionService.startPage(now);
      
      expect(runId).not.toBe(oldRun.id);
      
      const finalizedRun = await db.getRun(oldRun.id);
      expect(finalizedRun?.status).toBe("completed");
    });
  });

  describe("finishPage", () => {
    it("should save the page and maintain current run if gap is less than 5 minutes", async () => {
      const startedAt = new Date("2026-06-16T10:00:00Z").getTime();
      const finishedAt = startedAt + 60000; // 1 minute later
      
      const runId = await sessionService.startPage(new Date(startedAt));
      const events = [{ fromKey: "a", toKey: "b", latencyMs: 200, isCorrect: true, keyChar: "b" }];
      
      const newRunId = await sessionService.finishPage(
        runId,
        "hello world",
        "hello world",
        events as any,
        startedAt,
        finishedAt
      );

      expect(newRunId).toBe(runId); // Did not split
      const pages = await db.getPagesForRun(runId);
      expect(pages.length).toBe(1);
    });

    it("should split run if gap is greater than or equal to 5 minutes", async () => {
      const startedAt = new Date("2026-06-16T10:00:00Z").getTime();
      // 6 minutes elapsed
      const finishedAt = startedAt + 6 * 60 * 1000; 
      
      const runId = await sessionService.startPage(new Date(startedAt));
      const events = [
        { fromKey: null, toKey: "a", latencyMs: 0 },
        // 6 minute gap
        { fromKey: "a", toKey: "b", latencyMs: 6 * 60 * 1000 },
        { fromKey: "b", toKey: "c", latencyMs: 200 }
      ];
      
      const newRunId = await sessionService.finishPage(
        runId,
        "hello world",
        "hello world",
        events as any,
        startedAt,
        finishedAt
      );

      expect(newRunId).not.toBe(runId); // Split into new run
      
      const oldRun = await db.getRun(runId);
      expect(oldRun?.status).toBe("completed");
      
      const newRun = await db.getRun(newRunId);
      expect(newRun?.status).toBe("in_progress");
      
      const pages = await db.getPagesForRun(newRunId);
      expect(pages.length).toBe(1);
      // The page should be associated with the new run
    });
  });
});
