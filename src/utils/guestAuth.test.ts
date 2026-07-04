import { describe, it, expect } from "vitest";
import {
  isValidGuestId,
  parseGuestHeaders,
  signGuestToken,
  verifyGuestToken,
} from "@/utils/guestAuth";

describe("guestAuth", () => {
  const validGuestId = "guest_96deeccb-82a3-46c3-9d84-3723b9792f90";

  it("accepts guest_<uuid> format only", () => {
    expect(isValidGuestId(validGuestId)).toBe(true);
    expect(isValidGuestId("guest_not-a-uuid")).toBe(false);
    expect(isValidGuestId("user_96deeccb-82a3-46c3-9d84-3723b9792f90")).toBe(false);
    expect(isValidGuestId("")).toBe(false);
  });

  it("signs and verifies guest tokens", async () => {
    const token = await signGuestToken(validGuestId);
    expect(await verifyGuestToken(validGuestId, token)).toBe(true);
    expect(await verifyGuestToken(validGuestId, "invalid-token")).toBe(false);
    expect(await verifyGuestToken("guest_00000000-0000-0000-0000-000000000099", token)).toBe(false);
  });

  it("parses guest headers from request Headers", () => {
    const headers = new Headers({
      "x-guest-user-id": validGuestId,
      "x-guest-token": "token-value",
    });

    expect(parseGuestHeaders(headers)).toEqual({
      guestId: validGuestId,
      guestToken: "token-value",
    });
    expect(parseGuestHeaders(new Headers())).toEqual({
      guestId: null,
      guestToken: null,
    });
  });
});
