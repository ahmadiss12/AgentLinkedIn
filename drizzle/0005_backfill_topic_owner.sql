-- Data-only migration: assign any pre-accounts topics/agent_runs to the
-- legacy local user so existing local data isn't orphaned once every
-- topic requires an owner. On a fresh database (no legacy user, no rows)
-- these statements are no-ops.
UPDATE "topics"
SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'local@agentlinkedin.app' LIMIT 1)
WHERE "user_id" IS NULL;
--> statement-breakpoint
UPDATE "agent_runs"
SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'local@agentlinkedin.app' LIMIT 1)
WHERE "user_id" IS NULL;
--> statement-breakpoint
-- Safety net: delete any topic that still has no owner (would only happen
-- if the legacy user never existed on this database), since userId is
-- about to become required.
DELETE FROM "topics" WHERE "user_id" IS NULL;
