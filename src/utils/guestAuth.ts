import { createHmac, timingSafeEqual } from "crypto";

export const GUEST_ID_HEADER = "x-guest-user-id";
export const GUEST_TOKEN_HEADER = "x-guest-token";

const GUEST_ID_PATTERN = /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getGuestTokenSecret(): string {
  const secret = process.env.GUEST_TOKEN_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === "test") {
    return "test-guest-token-secret-32chars!!";
  }
  if (process.env.NODE_ENV === "development") {
    return "dev-guest-token-secret-change-me!!";
  }
  throw new Error("GUEST_TOKEN_SECRET must be set in production");
}

/** guest_<uuid> 형식인지 검증 */
export function isValidGuestId(guestId: string): boolean {
  return GUEST_ID_PATTERN.test(guestId);
}

export function signGuestToken(guestId: string): string {
  return createHmac("sha256", getGuestTokenSecret()).update(guestId).digest("base64url");
}

export function verifyGuestToken(guestId: string, token: string | null | undefined): boolean {
  if (!token || !isValidGuestId(guestId)) {
    return false;
  }

  const expected = signGuestToken(guestId);
  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);

  if (expectedBuf.length !== tokenBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, tokenBuf);
}

export function parseGuestHeaders(headers: Headers): {
  guestId: string | null;
  guestToken: string | null;
} {
  return {
    guestId: headers.get(GUEST_ID_HEADER),
    guestToken: headers.get(GUEST_TOKEN_HEADER),
  };
}

export class GuestAuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "GuestAuthError";
  }
}
