import { z } from "zod";

const UuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID");

/** 클라이언트 `KeyEvent` (camelCase) — `POST /api/session` finish body */
const SessionKeyEventSchema = z.object({
  fromKey: z.string().max(20).nullable(),
  toKey: z.string().min(1).max(20),
  latencyMs: z.number().finite().min(0).max(600_000),
  keyChar: z.string().max(10).optional(),
  holdDurationMs: z.number().finite().min(0).max(600_000).nullable().optional(),
  isCorrect: z.boolean().nullable().optional(),
  expectedChar: z.string().max(10).nullable().optional(),
});

export const MAX_SESSION_KEY_EVENTS = 10_000;

const SessionStartSchema = z.object({
  action: z.literal("start"),
  now: z.string().datetime(),
});

const SessionFinishSchema = z
  .object({
    action: z.literal("finish"),
    runId: UuidSchema,
    targetText: z.string().max(50_000),
    typedText: z.string().max(50_000),
    events: z.array(SessionKeyEventSchema).max(MAX_SESSION_KEY_EVENTS),
    startedAt: z.number().finite(),
    finishedAt: z.number().finite(),
    targetId: z.string().max(128).optional(),
    language: z.string().max(10).optional(),
  })
  .refine((data) => data.finishedAt >= data.startedAt, {
    message: "finishedAt must be greater than or equal to startedAt",
    path: ["finishedAt"],
  });

const SessionSyncSchema = z.object({
  action: z.literal("sync"),
});

export const SessionPostPayloadSchema = z.discriminatedUnion("action", [
  SessionStartSchema,
  SessionFinishSchema,
  SessionSyncSchema,
]);

type SessionPostPayload = z.infer<typeof SessionPostPayloadSchema>;
