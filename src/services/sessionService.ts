import { db } from "@/utils/db";
import { calculateMetrics, calculateLatencyAfterGap } from "@/lib/practice/metrics";
import type { KeyEvent } from "@/lib/skdm";

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
   * Starts a page session based on the current time and previous run state.
   * If the last active run is older than 3 minutes, it finalizes it and creates a new one.
   * Otherwise, it resumes the existing run.
   */
  public async startPage(dbUserId: string, now: Date): Promise<string> {
    const latestRun = await db.getLatestRun(dbUserId);
    let runId = "";

    if (latestRun && latestRun.status === "pending") {
      await db.updateRun(latestRun.id, {
        status: "in_progress",
        started_at: now.toISOString(),
      });
      runId = latestRun.id;
    } else if (latestRun && latestRun.status === "in_progress") {
      const runPages = await db.getPagesForRun(latestRun.id);
      const lastActiveStr =
        runPages.length > 0
          ? runPages[runPages.length - 1].finishedAt.toISOString()
          : latestRun.startedAt.toISOString();
      const lastActiveAt = new Date(lastActiveStr).getTime();

      if (now.getTime() - lastActiveAt > 3 * 60 * 1000) {
        // 3분 이상 지나면 이전 세션을 마감하고 새 세션을 엽니다.
        await db.finalizeRun(latestRun.id, lastActiveStr);
        runId = await this.createNewRun(dbUserId, now);
      } else {
        runId = latestRun.id;
      }
    } else {
      runId = await this.createNewRun(dbUserId, now);
    }

    return runId;
  }

  private async createNewRun(dbUserId: string, now: Date): Promise<string> {
    const newRun = await db.createRun({
      user_id: dbUserId,
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
    dbUserId: string,
    runId: string,
    targetText: string,
    typedText: string,
    events: KeyEvent[],
    startedAt: number,
    finishedAt: number,
    targetId?: string,
    language?: string,
  ): Promise<string> {
    let currentRunId = runId;

    // targetId나 language 중 하나라도 없을 때만 DB 조회 (동일 쿼리 중복 방지)
    let targetTextObj: Awaited<ReturnType<typeof db.findTargetText>> = null;
    if (!targetId || !language) {
      targetTextObj = await db.findTargetText({ content: targetText });
    }

    const isKorean = /[가-힣]/.test(targetText);
    const finalLanguage = language ?? (targetTextObj?.language ?? (isKorean ? "ko" : "en"));
    const finalTargetTextId = targetId ?? (targetTextObj?.id ?? "unknown");

    const getPerfNow = () => {
      if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
      }
      return Date.now();
    };

    const isRelative = startedAt && startedAt < 1e11;
    let absoluteStartedAt = startedAt;
    let absoluteFinishedAt = finishedAt;

    if (isRelative) {
      const nowMs = Date.now();
      const perfNow = getPerfNow();
      const relativeFinishAge = perfNow - finishedAt;
      absoluteFinishedAt = nowMs - relativeFinishAge;
      absoluteStartedAt = absoluteFinishedAt - (finishedAt - startedAt);
    }

    const rawElapsedTime = absoluteStartedAt ? absoluteFinishedAt - absoluteStartedAt : 0;
    let pageStartedAtStr = new Date(absoluteStartedAt || Date.now()).toISOString();
    const pageFinishedAtStr = new Date(absoluteFinishedAt).toISOString();

    if (rawElapsedTime >= 5 * 60 * 1000) {
      // 5분 이상 지연된 경우 -> 세션(Run) 분리
      const existingPages = await db.getPagesForRun(currentRunId);
      const lastPage = existingPages[existingPages.length - 1];
      const prevRun = await db.getRun(currentRunId);
      const finalizeTimeStr = lastPage
        ? lastPage.finishedAt.toISOString()
        : prevRun
          ? prevRun.startedAt.toISOString()
          : new Date().toISOString();
      await db.finalizeRun(currentRunId, finalizeTimeStr);

      // 3분(180,000ms) 이상의 긴 공백 이후의 실타건 latency 합 계산
      const activeTimeAfterGap = calculateLatencyAfterGap(events, 3 * 60 * 1000);
      const correctedStartTimestamp = absoluteFinishedAt - activeTimeAfterGap;
      pageStartedAtStr = new Date(correctedStartTimestamp).toISOString();

      currentRunId = await this.createNewRun(dbUserId, new Date(correctedStartTimestamp));
    }

    const metrics = calculateMetrics(events, 3000);
    const existingPages = await db.getPagesForRun(currentRunId);
    const order_index = existingPages.length;

    const key_events = events.map((e) => ({
      from_key: e.fromKey,
      to_key: e.toKey,
      key_char: e.keyChar || "",
      latency: Math.round(e.latencyMs),
      hold_duration_ms: e.holdDurationMs != null ? Math.round(e.holdDurationMs) : null,
      is_correct: e.isCorrect ?? true,
      expected_char: e.expectedChar ?? null,
    }));

    await db.createPage({
      run_id: currentRunId,
      target_text_id: finalTargetTextId,
      order_index,
      language: finalLanguage,
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
