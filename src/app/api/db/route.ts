import { NextResponse } from "next/server";
import { localDbService } from "@/utils/localDbService";
import { DbApiPayloadSchema } from "@/lib/api/dbSchemas";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Forbidden (API only available in development mode)" },
      { status: 403 },
    );
  }

  try {
    const data = await localDbService.getData();
    return NextResponse.json(data);
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
        const result = await localDbService.createRun({
          ...payload.runData,
          finished_at: null,
          cpm: null,
          wpm: null,
          accuracy: null,
        });
        return NextResponse.json(result);
      }
      case "updateRun": {
        const result = await localDbService.updateRun(payload.runId, payload.updates);
        return NextResponse.json(result);
      }
      case "deleteRun": {
        await localDbService.deleteRun(payload.runId);
        return NextResponse.json({ success: true });
      }
      case "createPage": {
        const result = await localDbService.createPage(payload.pageData);
        return NextResponse.json(result);
      }
      case "finalizeRun": {
        const result = await localDbService.finalizeRun(payload.runId, payload.finishedAtStr);
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
