import { NextRequest, NextResponse } from "next/server";
import { drizzleDb } from "@/db";
import { targetTexts } from "@/db/schema";
import { isNull, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // 1. Authorization header security check using CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[embed-backfill] CRON_SECRET environment variable is not set.");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Fetch pending texts that do not have embeddings yet
    const pendingTexts = await drizzleDb
      .select({ id: targetTexts.id, content: targetTexts.content })
      .from(targetTexts)
      .where(isNull(targetTexts.embedding))
      .limit(100);

    if (pendingTexts.length === 0) {
      return NextResponse.json({ success: true, message: "No texts pending embeddings." });
    }

    // 3. Call Upstage Embedding API
    const upstageApiKey = process.env.UPSTAGE_API_KEY;
    if (!upstageApiKey) {
      throw new Error("UPSTAGE_API_KEY is not set in environment variables.");
    }

    // Using Upstage batch request (input takes string[])
    const response = await fetch("https://api.upstage.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${upstageApiKey}`,
      },
      body: JSON.stringify({
        input: pendingTexts.map((t) => t.content),
        model: "solar-1-mini-embedding-query", // Standard model for queries / general embeddings
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upstage API Error: ${errorText}`);
    }

    const resData = await response.json();
    const embeddings = resData.data;

    if (!Array.isArray(embeddings) || embeddings.length !== pendingTexts.length) {
      throw new Error("Mismatch between pending texts count and returned embeddings count.");
    }

    // 4. Update the DB transactionally
    await drizzleDb.transaction(async (tx) => {
      for (let i = 0; i < pendingTexts.length; i++) {
        const item = pendingTexts[i];
        const vectorData = embeddings[i].embedding;
        await tx
          .update(targetTexts)
          .set({ embedding: vectorData })
          .where(eq(targetTexts.id, item.id));
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully backfilled ${pendingTexts.length} embeddings.`,
    });
  } catch (error: unknown) {
    console.error("[embed-backfill] Cron Job Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
