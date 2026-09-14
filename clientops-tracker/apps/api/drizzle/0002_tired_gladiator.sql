CREATE TABLE "mail_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_id" uuid,
	"kind" varchar(24) NOT NULL,
	"payload" text,
	"status" varchar(16) DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"last_error" varchar(32),
	CONSTRAINT "mail_outbox_status_check" CHECK ("mail_outbox"."status" IN ('PENDING', 'SENDING', 'DELIVERED', 'EXPIRED', 'FAILED')),
	CONSTRAINT "mail_outbox_kind_check" CHECK ("mail_outbox"."kind" IN ('INVITATION', 'PASSWORD_RESET', 'RECOVERY_REQUEST')),
	CONSTRAINT "mail_outbox_attempts_check" CHECK ("mail_outbox"."attempts" BETWEEN 0 AND 8)
);
--> statement-breakpoint
ALTER TABLE "mail_outbox" ADD CONSTRAINT "mail_outbox_token_id_account_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."account_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_outbox_queue_idx" ON "mail_outbox" USING btree ("status","available_at");