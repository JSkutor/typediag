import { NextRequest, NextResponse } from "next/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { db } from "@/utils/db";
import { formatDbErrorForClient, logDbError } from "@/utils/dbErrors";
import { GuestAuthError } from "@/utils/guestAuth";
import { resolveApiUser, withGuestToken } from "@/lib/api/resolveApiUser";
import { FeedbackPostPayloadSchema } from "@/lib/api/feedbackSchemas";
import { checkFeedbackRateLimit, getClientIp } from "@/lib/api/feedbackRateLimiter";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = FeedbackPostPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { userId, issueGuestToken } = await resolveApiUser(request);
    const limitCheck = await checkFeedbackRateLimit(userId);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        withGuestToken(
          {
            error: `일일 피드백 전송 한도를 초과했습니다. (최대 ${limitCheck.limit}회)`,
          },
          issueGuestToken,
        ),
        { status: 429 },
      );
    }

    await db.createUserFeedback({
      user_id: userId,
      message: parsed.data.message,
      language: parsed.data.language,
      ip_address: getClientIp(request),
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "feedback_submitted",
      properties: { language: parsed.data.language },
    });

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
      // Fire and forget
      fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**새로운 피드백 도착!** 📬\n\n**User ID:** \`${userId}\`\n**Language:** \`${parsed.data.language}\`\n**Message:**\n> ${parsed.data.message.replace(/\n/g, "\n> ")}`,
        }),
      }).catch((e) => console.error("[Discord Webhook Error]", e));
    }

    return NextResponse.json(withGuestToken({ success: true }, issueGuestToken));
  } catch (err: unknown) {
    if (err instanceof GuestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logDbError("[/api/feedback POST]", err);
    const { message, status, code } = formatDbErrorForClient(err);
    return NextResponse.json({ error: message, code }, { status });
  }
}
