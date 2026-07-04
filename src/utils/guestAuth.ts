const GUEST_ID_PATTERN = /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GUEST_ID_HEADER = "x-guest-user-id";
export const GUEST_TOKEN_HEADER = "x-guest-token";

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function signGuestToken(guestId: string): Promise<string> {
  const secret = getGuestTokenSecret();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(guestId);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, data);

  // Base64Url encoding
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function verifyGuestToken(
  guestId: string,
  token: string | null | undefined,
): Promise<boolean> {
  if (!token || !isValidGuestId(guestId)) {
    return false;
  }

  const expected = await signGuestToken(guestId);
  return timingSafeEqual(expected, token);
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
    readonly message: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "GuestAuthError";
  }
}
