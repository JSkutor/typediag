import * as users from "@/db/queries/users";
import * as practice from "@/db/queries/practice";
import * as sessions from "@/db/queries/sessions";
import * as stats from "@/db/queries/stats";
import * as feedback from "@/db/queries/feedback";

// Re-export row types and KeyEventSchema so consumers don't break
export * from "@/db/queries/sessions";
export * from "@/db/queries/practice";

export const db = {
  ...users,
  ...practice,
  ...sessions,
  ...stats,
  ...feedback,
};
