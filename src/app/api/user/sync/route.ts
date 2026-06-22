import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { users } from "@/db/schema";
import { db } from "@/utils/db";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.getOrCreateUserByClerkId(clerkUserId);

    const guestClerkId = request.headers.get("x-guest-user-id");
    if (guestClerkId?.startsWith("guest_") && guestClerkId !== clerkUserId) {
      const guestRows = await drizzleDb
        .select()
        .from(users)
        .where(eq(users.id, guestClerkId))
        .limit(1);

      const guestUser = guestRows[0];
      if (guestUser && guestUser.id !== user.id) {
        await db.mergeGuestData(guestUser.id, user.id);
      }
    }

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
