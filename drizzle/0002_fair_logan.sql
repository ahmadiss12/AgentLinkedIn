ALTER TABLE "notifications" ADD COLUMN "kind" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "ref_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_kind_ref_idx" ON "notifications" USING btree ("kind","ref_id") WHERE "notifications"."ref_id" IS NOT NULL;