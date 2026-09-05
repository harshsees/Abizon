-- The trip documents: PAN card, return ticket, hotel booking.
--
-- HAND-WRITTEN rather than generated, for one reason: `drizzle-kit generate`
-- emits `ALTER TYPE "public"."document_kind" ADD VALUE '…'` with no guard, and
-- re-running it against a database that already has the value is an error
-- rather than a no-op. Every other statement drizzle produces is idempotent in
-- practice; this one is not, and an enum addition is precisely the kind of
-- migration that gets replayed — against a branch database, against a restored
-- snapshot, against a preview environment somebody rebuilt.
--
-- `IF NOT EXISTS` is available on `ADD VALUE` from Postgres 12. Supabase is on
-- 15, so this is safe.
--
-- ── Why these three are one migration and not three ──
--
-- They arrive together and they are meaningless apart: an application is not
-- fileable with a hotel booking and no return ticket. Splitting them would
-- create two intermediate states of the database in which the application
-- refuses every upload of the kind that has not landed yet.
--
-- ── Why nothing is backfilled ──
--
-- There is no sensible default. An application submitted before these were
-- asked for genuinely does not have them, and writing a placeholder row would
-- put a document in the ops queue that nobody uploaded and nobody can review.
-- Applications already `submitted` keep the documents they were filed with;
-- `blockingReason` only gates applications still being assembled.
--
-- ── Note on ADD VALUE and transactions ──
--
-- Before Postgres 12, `ALTER TYPE … ADD VALUE` could not run inside a
-- transaction block at all. On 12+ it can, with one restriction: the new value
-- cannot be USED in the same transaction that adds it. Nothing below uses them
-- — the values are only ever written by the application at runtime — so the
-- statements are safe to run inside drizzle's migration transaction.

ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'panCard';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'returnTicket';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'hotelStay';
