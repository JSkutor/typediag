import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { eq } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { users } from "@/db/schema";
import { db } from "@/utils/db";
import { formatDbErrorForClient, logDbError } from "@/utils/dbErrors";
import {
  GuestAuthError,
  isValidGuestId,
  verifyGuestToken,
  GUEST_ID_HEADER,
  GUEST_TOKEN_HEADER,
} from "@/utils/guestAuth";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.getOrCreateUserByClerkId(clerkUserId);

    const guestClerkId = request.headers.get(GUEST_ID_HEADER);
    const guestToken = request.headers.get(GUEST_TOKEN_HEADER);

    if (guestClerkId?.startsWith("guest_") && guestClerkId !== clerkUserId) {
      if (!isValidGuestId(guestClerkId)) {
        return NextResponse.json({ error: "Invalid guest identification" }, { status: 400 });
      }

      if (!(await verifyGuestToken(guestClerkId, guestToken))) {
        return NextResponse.json(
          { error: "Guest token required for account merge" },
          { status: 401 },
        );
      }

      const guestRows = await drizzleDb
        .select()
        .from(users)
        .where(eq(users.id, guestClerkId))
        .limit(1);

      const guestUser = guestRows[0];
      if (guestUser && guestUser.id !== user.id) {
        await db.mergeGuestData(guestUser.id, user.id);
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: user.id,
          event: "user_signed_up",
          properties: { guest_merged: true },
        });
        posthog.alias({ distinctId: user.id, alias: guestUser.id });
      }
    }

    const posthog = getPostHogClient();
    posthog.identify({ distinctId: user.id });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: unknown) {
    if (err instanceof GuestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logDbError("/api/user/sync", err);
    const { message, status, code } = formatDbErrorForClient(err);
    return NextResponse.json({ error: message, code }, { status });
  }
}
