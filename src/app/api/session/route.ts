import { NextRequest, NextResponse } from "next/server";
import type { KeyEvent } from "@/lib/skdm";
import { sessionService } from "@/services/sessionService";
import { db } from "@/utils/db";
import { formatDbErrorForClient, logDbError } from "@/utils/dbErrors";
import { GuestAuthError } from "@/utils/guestAuth";
import { isDevOnlyEnabled } from "@/lib/api/isDevOnlyRoute";
import { resolveApiUser, withGuestToken } from "@/lib/api/resolveApiUser";
import { SessionPostPayloadSchema } from "@/lib/api/sessionSchemas";

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
        return NextResponse.json(
          { error: `Invalid action: ${String(_exhaustive)}` },
          { status: 400 },
        );
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

      if (process.env.NEXT_RUNTIME === "edge") {
        return NextResponse.json(
          { error: "Mock session not supported on Edge Runtime" },
          { status: 400 },
        );
      }
      const keys = [
        "q",
        "w",
        "e",
        "r",
        "t",
        "y",
        "u",
        "i",
        "o",
        "p",
        "a",
        "s",
        "d",
        "f",
        "g",
        "h",
        "j",
        "k",
        "l",
        "z",
        "x",
        "c",
        "v",
        "b",
        "n",
        "m",
      ];

      const events: KeyEvent[] = [];
      // Generate 1000 mock events to populate the 3D surface
      for (let i = 0; i < 1000; i++) {
        const toKey = keys[Math.floor(Math.random() * keys.length)];
        const fromKey = keys[Math.floor(Math.random() * keys.length)];

        // Base latency that varies across the keyboard to create a nice 3D landscape
        const idx = keys.indexOf(toKey);
        const baseLatency = 100 + idx * 5;
        const noise = (Math.random() - 0.5) * 60;

        events.push({
          fromKey,
          toKey,
          latencyMs: Math.max(10, baseLatency + noise),
          isCorrect: Math.random() > 0.05, // 5% error rate
        });
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
          eventsToAnalyze = keyEventsByPage.flat();
        }
      } else {
        eventsToAnalyze = await db.getKeyEventsForUser(dbUserId);
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
