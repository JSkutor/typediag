import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { KeyEvent } from "@/lib/skdm";
import { sessionService } from "@/services/sessionService";
import { db } from "@/utils/db";

async function getDbUserId(request: NextRequest): Promise<string> {
  const { userId: clerkUserId } = await auth();
  const guestUserId = request.headers.get("x-guest-user-id");

  const externalId = clerkUserId || guestUserId;
  if (!externalId) {
    throw new Error("Unauthorized: Missing user identification");
  }

  const user = await db.getOrCreateUserByClerkId(externalId);
  return user.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const dbUserId = await getDbUserId(request);

    switch (action) {
      case "start": {
        const { now } = body;
        const runId = await sessionService.startPage(dbUserId, new Date(now));
        return NextResponse.json({ runId });
      }
      case "finish": {
        const { runId, targetText, typedText, events, startedAt, finishedAt, targetId, language } =
          body;
        const newRunId = await sessionService.finishPage(
          dbUserId,
          runId,
          targetText,
          typedText,
          events,
          startedAt,
          finishedAt,
          targetId,
          language,
        );
        return NextResponse.json({ runId: newRunId });
      }
      case "sync": {
        await db.syncSessionOnMount(dbUserId);
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const dbUserId = await getDbUserId(request);

    if (action === "analysis") {
      const runId = searchParams.get("runId");
      if (!runId) {
        return NextResponse.json({ error: "Missing runId" }, { status: 400 });
      }

      // Ownership verification
      const run = await db.getRun(runId);
      if (!run || run.userId !== dbUserId) {
        return NextResponse.json({ error: "Unauthorized or Run not found" }, { status: 403 });
      }

      const pages = await db.getPagesForRun(runId);
      let eventsToAnalyze: KeyEvent[] = [];

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

      return NextResponse.json({ events: eventsToAnalyze });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
