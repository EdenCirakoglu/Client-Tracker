CREATE TABLE "account_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "account_tokens_kind_check" CHECK ("account_tokens"."kind" IN ('INVITATION', 'PASSWORD_RESET'))
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"expire" bigint
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"sid_hash" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"auth_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bootstrap_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bootstrap_state_singleton" CHECK ("bootstrap_state"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "web_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" varchar(16) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "web_sessions_expire_idx" ON "web_sessions" USING btree ("expire");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_status_check" CHECK ("users"."account_status" IN ('ACTIVE', 'INVITED', 'DISABLED'));
--> statement-breakpoint
-- Legacy fictional seed identities must never authenticate with production demo mode off.
UPDATE "users" SET "is_demo" = true WHERE lower("email") IN ('admin@example.com', 'developer@example.com', 'client@example.com', 'bluewave@example.com');
