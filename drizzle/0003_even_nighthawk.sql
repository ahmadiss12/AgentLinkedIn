CREATE TYPE "public"."topic_type" AS ENUM('news', 'learning');--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "type" "topic_type" DEFAULT 'news' NOT NULL;