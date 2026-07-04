
import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { DbApiPayloadSchema } from "@/lib/api/dbSchemas";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Forbidden (API only available in development mode)" },
      { status: 403 },
    );
  }

  try {
    const allRuns = await db.getAllRuns();
    return NextResponse.json({ runs: allRuns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Forbidden (API only available in development mode)" },
      { status: 403 },
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = DbApiPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    switch (payload.action) {
      case "createRun": {
        const result = await db.createRun({
          ...payload.runData,
        });
        return NextResponse.json(result);
      }
      case "updateRun": {
        const result = await db.updateRun(payload.runId, payload.updates);
        return NextResponse.json(result);
      }
      case "deleteRun": {
        await db.deleteRun(payload.runId);
        return NextResponse.json({ success: true });
      }
      case "createPage": {
        const result = await db.createPage(payload.pageData);
        return NextResponse.json(result);
      }
      case "finalizeRun": {
        const result = await db.finalizeRun(payload.runId, payload.finishedAtStr);
        return NextResponse.json(result);
      }
      default:
        // @ts-expect-error - Ensure all actions are covered by the discriminated union
        return NextResponse.json({ error: `Invalid action: ${payload.action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
