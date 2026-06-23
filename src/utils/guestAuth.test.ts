import { describe, it, expect } from "vitest";
import {
  isValidGuestId,
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

  it("signs and verifies guest tokens", () => {
    const token = signGuestToken(validGuestId);
    expect(verifyGuestToken(validGuestId, token)).toBe(true);
    expect(verifyGuestToken(validGuestId, "invalid-token")).toBe(false);
    expect(verifyGuestToken("guest_00000000-0000-0000-0000-000000000099", token)).toBe(false);
  });
});
