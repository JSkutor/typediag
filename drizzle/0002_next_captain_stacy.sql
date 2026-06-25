CREATE TABLE "topic_usage_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"action_type" varchar(20) NOT NULL,
	"usage_date" date DEFAULT now() NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "topic_usage_limits_user_date_action_unique" UNIQUE("user_id","action_type","usage_date")
);
--> statement-breakpoint
ALTER TABLE "topic_usage_limits" ADD CONSTRAINT "topic_usage_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;