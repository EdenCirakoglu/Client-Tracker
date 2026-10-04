CREATE TABLE "scope_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"scope" text NOT NULL,
	"exclusions" text NOT NULL,
	"estimate" text NOT NULL,
	"delivery_implications" text NOT NULL,
	"external_reference" varchar(255),
	"approver_id" uuid NOT NULL,
	"approver_name" text NOT NULL,
	"proposed_by" text NOT NULL,
	"state" varchar(24) DEFAULT 'PROPOSED' NOT NULL,
	"decided_by" text,
	"feedback" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scope_proposals_state_check" CHECK ("scope_proposals"."state" IN ('PROPOSED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
	CONSTRAINT "scope_proposals_revision_check" CHECK ("scope_proposals"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "scope_proposals" ADD CONSTRAINT "scope_proposals_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_proposals" ADD CONSTRAINT "scope_proposals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scope_proposals_ticket_revision_unique" ON "scope_proposals" USING btree ("ticket_id","revision");