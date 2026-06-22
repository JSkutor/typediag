CREATE TABLE "key_events" (
	"id" bigserial,
	"page_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"from_key" varchar(20),
	"to_key" varchar(20) NOT NULL,
	"key_char" varchar(10) DEFAULT '',
	"latency" integer NOT NULL,
	"hold_duration_ms" integer,
	"is_correct" boolean,
	"expected_char" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "key_events_pk" PRIMARY KEY("id","created_at")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"target_text_id" varchar(50),
	"order_index" integer NOT NULL,
	"language" varchar(10) NOT NULL,
	"typed_text" text NOT NULL,
	"wpm" integer NOT NULL,
	"cpm" integer NOT NULL,
	"accuracy" real NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"elapsed_time_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"cpm" integer,
	"wpm" integer,
	"accuracy" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "target_texts" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"language" varchar(10) NOT NULL,
	"source" varchar(20) DEFAULT 'default' NOT NULL,
	"generator_model" varchar(50),
	"subject" text,
	"user_id" varchar(255),
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"embedding" vector(4096),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "target_texts_content_unique" UNIQUE("content")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "key_events" ADD CONSTRAINT "key_events_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_target_text_id_target_texts_id_fk" FOREIGN KEY ("target_text_id") REFERENCES "public"."target_texts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_texts" ADD CONSTRAINT "target_texts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;