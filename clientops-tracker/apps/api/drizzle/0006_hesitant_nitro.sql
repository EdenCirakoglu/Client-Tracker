ALTER TABLE "delivery_revisions" ADD COLUMN "target_date" date;--> statement-breakpoint
ALTER TABLE "delivery_revisions" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "delivery_revisions" ADD COLUMN "owner_name" text;--> statement-breakpoint
ALTER TABLE "delivery_revisions" ADD CONSTRAINT "delivery_revisions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_revisions_target_date_idx" ON "delivery_revisions" USING btree ("target_date");