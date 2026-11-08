ALTER TABLE "mail_outbox" DROP CONSTRAINT "mail_outbox_kind_check";--> statement-breakpoint
ALTER TABLE "mail_outbox" ADD COLUMN "deduplication_key" varchar(200);--> statement-breakpoint
ALTER TABLE "mail_outbox" ADD COLUMN "recipient_id" uuid;--> statement-breakpoint
ALTER TABLE "mail_outbox" ADD COLUMN "notification_event" varchar(32);--> statement-breakpoint
ALTER TABLE "scope_proposals" ADD COLUMN "proposed_by_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workflow_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_outbox" ADD CONSTRAINT "mail_outbox_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_proposals" ADD CONSTRAINT "scope_proposals_proposed_by_id_users_id_fk" FOREIGN KEY ("proposed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_outbox" ADD CONSTRAINT "mail_outbox_deduplication_key_unique" UNIQUE("deduplication_key");--> statement-breakpoint
ALTER TABLE "mail_outbox" ADD CONSTRAINT "mail_outbox_kind_check" CHECK ("mail_outbox"."kind" IN ('INVITATION', 'PASSWORD_RESET', 'RECOVERY_REQUEST', 'WORKFLOW'));
