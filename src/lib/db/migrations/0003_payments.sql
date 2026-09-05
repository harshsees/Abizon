-- Razorpay payments.
--
-- Hand-written, like 0002, and for the same reason plus one more: the enum
-- creation drizzle emits is unguarded, and so is the table creation. A
-- migration that is replayed against a branch database, a restored snapshot or
-- a rebuilt preview should be a no-op rather than an error.
--
-- ── Why `amount_paise` and not `amount` ──
--
-- Razorpay's API is denominated in the smallest currency unit, and so is this,
-- but matching their API is the lesser reason. Money in a floating-point column
-- is money that is one day out by a hundredth of a rupee, and the hundredth is
-- discovered during a reconciliation rather than by a test. `bigint` is well
-- past any visa fee and well inside JavaScript's safe integer range.
--
-- ── Why the unique index is on the ORDER and not the payment ──
--
-- The order id exists from the moment we ask Razorpay for one; the payment id
-- arrives later, from the browser handshake or from the webhook, whichever
-- lands first. The unique index on `razorpay_order_id` is what makes the
-- webhook idempotent: it finds the row by order and writes a status, so a
-- webhook delivered three times — which Razorpay will do — writes the same
-- status three times instead of creating three rows.
--
-- ── Why `user_id` is ON DELETE RESTRICT ──
--
-- Every other foreign key in this schema cascades or nulls. This one refuses.
-- A payment is a financial record and India's tax rules require it to be
-- retained for years after the account it belonged to is closed, so deleting a
-- user who has paid us has to be a deliberate act that fails loudly rather than
-- one that quietly takes the ledger with it. Erasure under the DPDP Act is
-- satisfied by removing the personal data, which lives on `users` and
-- `travellers` — not by removing the fact that a transaction occurred.

DO $$ BEGIN
  CREATE TYPE "public"."payment_status" AS ENUM('created', 'authorized', 'captured', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "razorpay_order_id" text NOT NULL,
  "razorpay_payment_id" text,
  "signature" text,
  "amount_paise" bigint NOT NULL,
  "currency" text DEFAULT 'INR' NOT NULL,
  "status" "payment_status" DEFAULT 'created' NOT NULL,
  "failure_reason" text,
  "method" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "captured_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_applications_id_fk"
    FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "payments_order_idx" ON "payments" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_application_idx" ON "payments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint

-- Row-level security, matching 0001's argument for the storage buckets.
--
-- The application's own client uses the service-role key and bypasses this. It
-- is the second lock: if an anon or authenticated key ever reaches a client
-- bundle or a misconfigured integration, the difference between a mistake and a
-- readable payment ledger is whether this exists. There is no policy granting
-- anything, which is the point — nothing but the service role may read or write
-- this table.
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
