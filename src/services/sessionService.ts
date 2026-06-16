import { db } from "@/utils/db";
import { calculateMetrics, calculateLatencyAfterGap } from "@/lib/practice/metrics";
import type { KeyEvent } from "@/lib/skdm";
import targets from "@/data/targets.json";

export class SessionService {
  private static instance: SessionService;

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Initializes a run based on the current time and previous run state.
   * If the last active run is older than 5 minutes, it finalizes it and creates a new one.
   * Otherwise, it resumes the existing run.
   */
  public async initializeRun(now: Date): Promise<string> {
    const latestRun = await db.getLatestRun();
    let runId = "";
    
    if (latestRun && latestRun.status === "pending") {
      await db.updateRun(latestRun.id, {
        status: "in_progress",
        started_at: now.toISOString(),
      });
      runId = latestRun.id;
    } else if (latestRun && latestRun.status === "in_progress") {
      const pages = await db.getPagesForRun(latestRun.id);
      const lastActiveStr = pages.length > 0 ? pages[pages.length - 1].finished_at : latestRun.started_at;
      const lastActiveAt = new Date(lastActiveStr).getTime();
      
      if (now.getTime() - lastActiveAt > 5 * 60 * 1000) {
        // 5분 이상 지나면 이전 세션을 마감하고 새 세션을 엽니다.
        await db.finalizeRun(latestRun.id, lastActiveStr);
        runId = await this.createNewRun(now);
      } else {
        runId = latestRun.id;
      }
    } else {
      runId = await this.createNewRun(now);
    }
    
    return runId;
  }

  private async createNewRun(now: Date): Promise<string> {
    const newRun = await db.createRun({
      id: `run_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      user_id: "user_001",
      status: "pending",
      started_at: now.toISOString(),
    });
    await db.updateRun(newRun.id, {
      status: "in_progress",
      started_at: now.toISOString(),
    });
    return newRun.id;
  }

  /**
   * Finishes a typing session for a specific target text (a Page) and records it.
   * Splits the run if there's been a long gap during the page itself.
   */
  public async finishPage(
    runId: string,
    targetText: string,
    typedText: string,
    events: KeyEvent[],
    startedAt: number,
    finishedAt: number
  ): Promise<string> {
    let currentRunId = runId;
    const isKorean = /[가-힣]/.test(targetText);
    const targetTextObj = targets.find((t) => t.content === targetText);
    const targetTextId = targetTextObj ? targetTextObj.id : "unknown";
    const language = targetTextObj ? targetTextObj.language : (isKorean ? "ko" : "en");

    const rawElapsedTime = startedAt ? (finishedAt - startedAt) : 0;
    let pageStartedAtStr = new Date(startedAt || Date.now()).toISOString();
    const pageFinishedAtStr = new Date(finishedAt).toISOString();

    if (rawElapsedTime >= 10 * 60 * 1000) {
      // 10분 이상 지연된 경우 -> 세션(Run) 분리
      const existingPages = await db.getPagesForRun(currentRunId);
      const lastPage = existingPages[existingPages.length - 1];
      const prevRun = await db.getRun(currentRunId);
      const finalizeTimeStr = lastPage ? lastPage.finished_at : (prevRun ? prevRun.started_at : new Date().toISOString());
      await db.finalizeRun(currentRunId, finalizeTimeStr);

      // 5분(300,000ms) 이상의 긴 공백 이후의 실타건 latency 합 계산
      const activeTimeAfterGap = calculateLatencyAfterGap(events, 5 * 60 * 1000);
      const correctedStartTimestamp = finishedAt - activeTimeAfterGap;
      pageStartedAtStr = new Date(correctedStartTimestamp).toISOString();

      currentRunId = await this.createNewRun(new Date(correctedStartTimestamp));
    }

    const metrics = calculateMetrics(events, 3000);
    const existingPages = await db.getPagesForRun(currentRunId);
    const order_index = existingPages.length;

    const key_events = events.map((e) => ({
      from_key: e.fromKey,
      to_key: e.toKey,
      key_char: e.keyChar || "",
      latency: e.latencyMs,
      hold_duration_ms: e.holdDurationMs ?? 50,
      is_correct: e.isCorrect ?? true,
      expected_char: e.expectedChar ?? null,
    }));

    await db.createPage({
      id: `page_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      run_id: currentRunId,
      target_text_id: targetTextId,
      order_index,
      language,
      typed_text: typedText,
      wpm: metrics.wpm,
      cpm: metrics.cpm,
      accuracy: metrics.accuracy,
      started_at: pageStartedAtStr,
      finished_at: pageFinishedAtStr,
      elapsed_time_ms: metrics.elapsed_time_ms,
      key_events,
    });

    return currentRunId;
  }
}

export const sessionService = SessionService.getInstance();
