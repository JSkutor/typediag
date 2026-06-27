/**
 * Drizzle ORM Schema for TypeDiag
 *
 * Tables: users, target_texts, runs, pages, key_events
 * key_events is designed to be converted into a TimescaleDB Hypertable.
 *
 * Naming convention: snake_case for DB columns (matching DB_SCHEMA.md),
 * Drizzle maps them to camelCase via the column builder's name parameter.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  boolean,
  real,
  timestamp,
  bigserial,
  customType,
  primaryKey,
  serial,
  date,
  unique,
} from "drizzle-orm/pg-core";

// --- Custom pgvector type ---
const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 4096})`;
  },
  fromDriver(value: string): number[] {
    // pgvector returns '[1,2,3]' format
    return value
      .slice(1, -1)
      .split(",")
      .map((v) => parseFloat(v));
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
});

// --- Tables ---

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const targetTexts = pgTable("target_texts", {
  id: varchar("id", { length: 50 }).primaryKey(),
  content: text("content").unique().notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  source: varchar("source", { length: 20 }).notNull().default("default"),
  generatorModel: varchar("generator_model", { length: 50 }),
  topic: text("topic"),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  embedding: vector("embedding", { dimensions: 4096 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  cpm: integer("cpm"),
  wpm: integer("wpm"),
  accuracy: real("accuracy"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),
  targetTextId: varchar("target_text_id", { length: 50 }).references(() => targetTexts.id, {
    onDelete: "set null",
  }),
  orderIndex: integer("order_index").notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  typedText: text("typed_text").notNull(),
  wpm: integer("wpm").notNull(),
  cpm: integer("cpm").notNull(),
  accuracy: real("accuracy").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  elapsedTimeMs: integer("elapsed_time_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const keyEvents = pgTable(
  "key_events",
  {
    id: bigserial("id", { mode: "bigint" }),
    pageId: uuid("page_id")
      .references(() => pages.id, { onDelete: "cascade" })
      .notNull(),
    seq: integer("seq").notNull(),
    fromKey: varchar("from_key", { length: 20 }),
    toKey: varchar("to_key", { length: 20 }).notNull(),
    keyChar: varchar("key_char", { length: 10 }).default(""),
    latency: integer("latency").notNull(),
    holdDurationMs: integer("hold_duration_ms"),
    isCorrect: boolean("is_correct"),
    expectedChar: varchar("expected_char", { length: 10 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ name: "key_events_pk", columns: [table.id, table.createdAt] })],
);

// --- Type exports ---
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TargetText = typeof targetTexts.$inferSelect;
export type NewTargetText = typeof targetTexts.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type KeyEventRow = typeof keyEvents.$inferSelect;
export type NewKeyEvent = typeof keyEvents.$inferInsert;

export const topicUsageLimits = pgTable(
  "topic_usage_limits",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    actionType: varchar("action_type", { length: 20 }).notNull(), // 'search' | 'generate'
    usageDate: date("usage_date").defaultNow().notNull(),
    requestCount: integer("request_count").default(1).notNull(),
  },
  (table) => [
    unique("topic_usage_limits_user_date_action_unique").on(table.userId, table.actionType, table.usageDate),
  ]
);

export type TopicUsageLimit = typeof topicUsageLimits.$inferSelect;
export type NewTopicUsageLimit = typeof topicUsageLimits.$inferInsert;

export const userFeedbacks = pgTable("user_feedbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  message: text("message").notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserFeedback = typeof userFeedbacks.$inferSelect;
export type NewUserFeedback = typeof userFeedbacks.$inferInsert;

