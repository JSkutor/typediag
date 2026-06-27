import { z } from "zod";

export const FEEDBACK_MESSAGE_MIN = 1;
export const FEEDBACK_MESSAGE_MAX = 5000;

export const FeedbackPostPayloadSchema = z.object({
  message: z
    .string()
    .trim()
    .min(FEEDBACK_MESSAGE_MIN, "Message is required")
    .max(FEEDBACK_MESSAGE_MAX, `Message must be at most ${FEEDBACK_MESSAGE_MAX} characters`),
  language: z.enum(["ko", "en"]),
});

export type FeedbackPostPayload = z.infer<typeof FeedbackPostPayloadSchema>;
