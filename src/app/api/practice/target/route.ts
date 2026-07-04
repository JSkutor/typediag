
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";

const SUPPORTED_LANGUAGES = new Set(["ko", "en"]);

export async function GET(req: NextRequest) {
  try {
    const language = req.nextUrl.searchParams.get("language") ?? "ko";
    const exclude = req.nextUrl.searchParams.get("exclude") ?? undefined;

    if (!SUPPORTED_LANGUAGES.has(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    let target = await db.getRandomTargetText(language, exclude);
    if (!target && exclude) {
      target = await db.getRandomTargetText(language);
    }

    if (!target) {
      return NextResponse.json({ error: "No targets found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: target.id,
        content: target.content,
        language: target.language,
      },
    });
  } catch (error: unknown) {
    console.error("Normal target fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
