import { drizzleDb } from "@/db";
import { userFeedbacks, type UserFeedback } from "@/db/schema";

export async function createUserFeedback(data: {
  user_id: string;
  message: string;
  language: string;
  ip_address?: string;
}): Promise<UserFeedback> {
  const [feedback] = await drizzleDb
    .insert(userFeedbacks)
    .values({
      userId: data.user_id,
      message: data.message,
      language: data.language,
      ipAddress: data.ip_address ?? null,
    })
    .returning();

  return feedback;
}
