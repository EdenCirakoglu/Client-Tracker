CREATE TABLE "delivery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" varchar(32) NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_events_action_check" CHECK ("delivery_events"."action" IN ('PROPOSED', 'AGREED', 'ACCEPTANCE_REQUESTED', 'ACCEPTED', 'CHANGES_REQUESTED'))
);
--> statement-breakpoint
CREATE TABLE "delivery_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"outcome" text NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewer_name" text NOT NULL,
	"state" varchar(32) DEFAULT 'PROPOSED' NOT NULL,
	"release_id" uuid,
	"release_version" text,
	"delivery_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_revisions_state_check" CHECK ("delivery_revisions"."state" IN ('PROPOSED', 'AGREED', 'AWAITING_ACCEPTANCE', 'ACCEPTED', 'CHANGES_REQUESTED')),
	CONSTRAINT "delivery_revisions_revision_check" CHECK ("delivery_revisions"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "original_title" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "original_description" text;--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_revision_id_delivery_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."delivery_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_revisions" ADD CONSTRAINT "delivery_revisions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_revisions" ADD CONSTRAINT "delivery_revisions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_revisions" ADD CONSTRAINT "delivery_revisions_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_events_revision_action_unique" ON "delivery_events" USING btree ("revision_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_revisions_ticket_revision_unique" ON "delivery_revisions" USING btree ("ticket_id","revision");