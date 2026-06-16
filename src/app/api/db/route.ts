import { NextResponse } from "next/server";
import { localDbService } from "@/utils/localDbService";

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
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "createRun": {
        const result = await localDbService.createRun(body.runData);
        return NextResponse.json(result);
      }
      case "updateRun": {
        const result = await localDbService.updateRun(body.runId, body.updates);
        return NextResponse.json(result);
      }
      case "deleteRun": {
        await localDbService.deleteRun(body.runId);
        return NextResponse.json({ success: true });
      }
      case "createPage": {
        const result = await localDbService.createPage(body.pageData);
        return NextResponse.json(result);
      }
      case "finalizeRun": {
        const result = await localDbService.finalizeRun(body.runId, body.finishedAtStr);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
