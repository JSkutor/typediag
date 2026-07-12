import { z } from "zod";

const RunStatusSchema = z.enum(["pending", "in_progress", "completed"]);

const KeyEventSchema = z.object({
  from_key: z.string().nullable(),
  to_key: z.string(),
  key_char: z.string(),
  latency: z.number(),
  hold_duration_ms: z.number().nullable(),
  is_correct: z.boolean().nullable(),
  expected_char: z.string().nullable(),
});

const CreateRunSchema = z.object({
  action: z.literal("createRun"),
  runData: z.object({
    id: z.string(),
    user_id: z.string().nullable(),
    status: RunStatusSchema,
    started_at: z.string(),
  }),
});

const DeleteRunSchema = z.object({
  action: z.literal("deleteRun"),
  runId: z.string(),
});

const UpdateRunSchema = z.object({
  action: z.literal("updateRun"),
  runId: z.string(),
  updates: z.object({
    user_id: z.string().nullable().optional(),
    status: RunStatusSchema.optional(),
    started_at: z.string().optional(),
    finished_at: z.string().nullable().optional(),
    cpm: z.number().nullable().optional(),
    wpm: z.number().nullable().optional(),
    accuracy: z.number().nullable().optional(),
  }),
});

const CreatePageSchema = z.object({
  action: z.literal("createPage"),
  pageData: z.object({
    id: z.string(),
    run_id: z.string(),
    target_text_id: z.string(),
    order_index: z.number(),
    language: z.string(),
    typed_text: z.string(),
    wpm: z.number(),
    cpm: z.number(),
    accuracy: z.number(),
    started_at: z.string(),
    finished_at: z.string(),
    elapsed_time_ms: z.number(),
    key_events: z.array(KeyEventSchema),
  }),
});

const FinalizeRunSchema = z.object({
  action: z.literal("finalizeRun"),
  runId: z.string(),
  finishedAtStr: z.string().optional(),
});

export const DbApiPayloadSchema = z.discriminatedUnion("action", [
  CreateRunSchema,
  DeleteRunSchema,
  UpdateRunSchema,
  CreatePageSchema,
  FinalizeRunSchema,
]);

type DbApiPayload = z.infer<typeof DbApiPayloadSchema>;
