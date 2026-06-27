import { describe, it, expect } from "vitest";
import { FeedbackPostPayloadSchema } from "./feedbackSchemas";

describe("FeedbackPostPayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = FeedbackPostPayloadSchema.safeParse({
      message: "hello",
      language: "ko",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = FeedbackPostPayloadSchema.safeParse({
      message: "   ",
      language: "ko",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over max length", () => {
    const result = FeedbackPostPayloadSchema.safeParse({
      message: "a".repeat(5001),
      language: "en",
    });
    expect(result.success).toBe(false);
  });
});
