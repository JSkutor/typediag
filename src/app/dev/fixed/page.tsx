import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { drizzleDb } from "@/db";
import { targetTexts } from "@/db/schema";
import FixedTargetsWorkspace from "./FixedTargetsWorkspace";

export default async function DevFixedPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  // Fetch 10 random Korean target texts from the database
  const targets = await drizzleDb
    .select()
    .from(targetTexts)
    .where(sql`${targetTexts.language} = 'ko'`)
    .orderBy(sql`RANDOM()`)
    .limit(10);

  return <FixedTargetsWorkspace targets={targets} />;
}
