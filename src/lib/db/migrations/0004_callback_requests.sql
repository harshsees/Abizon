-- Callback requests for sticker visas (Schengen, USA, Canada).
--
-- Hand-written, like 0002 and 0003, so a replay is a no-op rather than an
-- error. drizzle-kit generated this file with the payments table in it as well:
-- 0003 was hand-written and its snapshot never recorded that table. The
-- snapshot beside this file (0004) does record it, so the next generate starts
-- from the schema as it really is; only the new table belongs in this SQL.

CREATE TABLE IF NOT EXISTS "callback_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_slug" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"travel_plan" text,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "callback_requests_status_idx" ON "callback_requests" USING btree ("status","created_at");
