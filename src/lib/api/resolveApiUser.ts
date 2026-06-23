import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/utils/db";
import {
  GuestAuthError,
  isValidGuestId,
  parseGuestHeaders,
  signGuestToken,
  verifyGuestToken,
} from "@/utils/guestAuth";

export interface ResolvedApiUser {
  userId: string;
  /** Set when the client should persist a new guest token. */
  issueGuestToken?: string;
}

export interface ResolveApiUserOptions {
  /** When true, guest requests must include a valid X-Guest-Token (no bootstrap). */
  requireGuestToken?: boolean;
}

export async function resolveApiUser(
  request: NextRequest,
  options: ResolveApiUserOptions = {},
): Promise<ResolvedApiUser> {
  const { userId: clerkUserId } = await auth();
  if (clerkUserId) {
    const user = await db.getOrCreateUserByClerkId(clerkUserId);
    return { userId: user.id };
  }

  const { guestId, guestToken } = parseGuestHeaders(request.headers);

  if (!guestId || !isValidGuestId(guestId)) {
    throw new GuestAuthError("Unauthorized: Missing or invalid guest identification");
  }

  const tokenValid = verifyGuestToken(guestId, guestToken);

  if (options.requireGuestToken && !tokenValid) {
    throw new GuestAuthError("Unauthorized: Guest token required or invalid");
  }

  const user = await db.getOrCreateUserByClerkId(guestId);

  return {
    userId: user.id,
    issueGuestToken: tokenValid ? undefined : signGuestToken(guestId),
  };
}

export function withGuestToken<T extends Record<string, unknown>>(
  body: T,
  issueGuestToken?: string,
): T & { guestToken?: string } {
  if (!issueGuestToken) {
    return body;
  }
  return { ...body, guestToken: issueGuestToken };
}
