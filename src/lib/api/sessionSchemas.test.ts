import { describe, it, expect } from "vitest";
import { MAX_SESSION_KEY_EVENTS, SessionPostPayloadSchema } from "./sessionSchemas";

const validFinish = {
  action: "finish" as const,
  runId: "00000000-0000-0000-0000-000000000001",
  targetText: "hello",
  typedText: "hello",
  events: [
    {
      fromKey: null,
      toKey: "h",
      latencyMs: 0,
      keyChar: "h",
      isCorrect: true,
    },
  ],
  startedAt: 1000,
  finishedAt: 2000,
};

describe("SessionPostPayloadSchema", () => {
  it("accepts valid finish payload", () => {
    const result = SessionPostPayloadSchema.safeParse(validFinish);
    expect(result.success).toBe(true);
  });

  it("rejects finish when finishedAt is before startedAt", () => {
    const result = SessionPostPayloadSchema.safeParse({
      ...validFinish,
      startedAt: 2000,
      finishedAt: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects finish when events exceed max length", () => {
    const result = SessionPostPayloadSchema.safeParse({
      ...validFinish,
      events: Array.from({ length: MAX_SESSION_KEY_EVENTS + 1 }, (_, i) => ({
        fromKey: "a",
        toKey: "b",
        latencyMs: i,
      })),
    });
    expect(result.success).toBe(false);
  });

  it("rejects finish with invalid runId", () => {
    const result = SessionPostPayloadSchema.safeParse({
      ...validFinish,
      runId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid start payload", () => {
    const result = SessionPostPayloadSchema.safeParse({
      action: "start",
      now: "2026-06-24T12:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts sync payload", () => {
    const result = SessionPostPayloadSchema.safeParse({ action: "sync" });
    expect(result.success).toBe(true);
  });
});
