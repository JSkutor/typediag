import { NextRequest, NextResponse } from "next/server";
import type { KeyEvent } from "@/lib/skdm";
import { sessionService } from "@/services/sessionService";
import { db } from "@/utils/db";
import { formatDbErrorForClient, logDbError } from "@/utils/dbErrors";
import { GuestAuthError } from "@/utils/guestAuth";
import { isDevOnlyEnabled } from "@/lib/api/isDevOnlyRoute";
import { resolveApiUser, withGuestToken } from "@/lib/api/resolveApiUser";
import { SessionPostPayloadSchema } from "@/lib/api/sessionSchemas";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = SessionPostPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const { userId: dbUserId, issueGuestToken } = await resolveApiUser(request);

    switch (body.action) {
      case "start": {
        const runId = await sessionService.startPage(dbUserId, new Date(body.now));
        return NextResponse.json(withGuestToken({ runId }, issueGuestToken));
      }
      case "finish": {
        const { runId, targetText, typedText, events, startedAt, finishedAt, targetId, language } =
          body;
        const newRunId = await sessionService.finishPage(
          dbUserId,
          runId,
          targetText,
          typedText,
          events as KeyEvent[],
          startedAt,
          finishedAt,
          targetId,
          language,
        );
        return NextResponse.json(
          withGuestToken(
            {
              runId: newRunId.runId,
              cpm: newRunId.cpm,
              wpm: newRunId.wpm,
              accuracy: newRunId.accuracy,
            },
            issueGuestToken,
          ),
        );
      }
      case "sync": {
        await db.syncSessionOnMount(dbUserId);
        return NextResponse.json(withGuestToken({ success: true }, issueGuestToken));
      }
      default: {
        const _exhaustive: never = body;
        return NextResponse.json({ error: `Invalid action: ${String(_exhaustive)}` }, { status: 400 });
      }
    }
  } catch (err: unknown) {
    if (err instanceof GuestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logDbError("[/api/session]", err);
    const { message, status, code } = formatDbErrorForClient(err);
    return NextResponse.json({ error: message, code }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "mock") {
      if (!isDevOnlyEnabled()) {
        return NextResponse.json(
          { error: "Forbidden (mock session only available in development mode)" },
          { status: 403 },
        );
      }

      const filePath = path.join(process.cwd(), "src/data/local_db.json");
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "local_db.json not found on server" }, { status: 404 });
      }

      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      const dbData = JSON.parse(fileContent);

      const events: KeyEvent[] = [];
      if (dbData.pages) {
        for (const page of dbData.pages) {
          if (!page.key_events) continue;
          for (const ev of page.key_events) {
            events.push({
              fromKey: ev.from_key,
              toKey: ev.to_key,
              latencyMs: ev.latency ?? 0,
              keyChar: ev.key_char,
              holdDurationMs: ev.hold_duration_ms,
              isCorrect: ev.is_correct,
              expectedChar: ev.expected_char,
            });
          }
        }
      }

      return NextResponse.json({ events });
    }

    const { userId: dbUserId, issueGuestToken } = await resolveApiUser(request, {
      requireGuestToken: true,
    });

    if (action === "analysis") {
      const runId = searchParams.get("runId");
      let eventsToAnalyze: KeyEvent[] = [];

      if (runId && runId !== "all") {
        const run = await db.getRun(runId);
        if (!run || run.userId !== dbUserId) {
          return NextResponse.json({ error: "Unauthorized or Run not found" }, { status: 403 });
        }

        const pages = await db.getPagesForRun(runId);
        if (pages.length > 0) {
          const keyEventsByPage = await Promise.all(pages.map((p) => db.getKeyEventsForPage(p.id)));

          eventsToAnalyze = keyEventsByPage.flatMap((pageEvents) =>
            pageEvents.map((ev) => ({
              fromKey: ev.fromKey,
              toKey: ev.toKey,
              latencyMs: ev.latency,
              keyChar: ev.keyChar || undefined,
              holdDurationMs: ev.holdDurationMs,
              isCorrect: ev.isCorrect,
              expectedChar: ev.expectedChar,
            })),
          );
        }
      } else {
        const userEvents = await db.getKeyEventsForUser(dbUserId);
        eventsToAnalyze = userEvents.map((ev) => ({
          fromKey: ev.fromKey,
          toKey: ev.toKey,
          latencyMs: ev.latency,
          keyChar: ev.keyChar || undefined,
          holdDurationMs: ev.holdDurationMs,
          isCorrect: ev.isCorrect,
          expectedChar: ev.expectedChar,
        }));
      }

      return NextResponse.json(withGuestToken({ events: eventsToAnalyze }, issueGuestToken));
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof GuestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logDbError("[/api/session GET]", err);
    const { message, status, code } = formatDbErrorForClient(err);
    return NextResponse.json({ error: message, code }, { status });
  }
}
