DROP TABLE "key_events" CASCADE;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "packed_from_keys" varchar(20)[];--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "packed_to_keys" varchar(20)[];--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "packed_latencies" integer[];--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "packed_holds" integer[];--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "packed_is_corrects" boolean[];--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "packed_expected_chars" varchar(10)[];--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "packed_key_chars" varchar(10)[];