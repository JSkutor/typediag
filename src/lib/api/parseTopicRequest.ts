import { NextResponse } from "next/server";
import { validateTopic } from "@/utils/validation";

export type ParseTopicRequestResult =
  | { ok: true; topic: string }
  | { ok: false; response: NextResponse };

export async function parseTopicRequest(req: Request): Promise<ParseTopicRequestResult> {
  const body = (await req.json()) as { topic?: unknown };

  if (!body.topic || typeof body.topic !== "string") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid topic provided" }, { status: 400 }),
    };
  }

  const validation = validateTopic(body.topic);
  if (!validation.isValid) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: validation.reason || "올바르지 않은 주제입니다." },
        { status: 400 },
      ),
    };
  }

  return { ok: true, topic: body.topic };
}
