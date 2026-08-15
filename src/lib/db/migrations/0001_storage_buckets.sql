-- Storage buckets and row-level security.
--
-- HAND-WRITTEN, not generated. `drizzle-kit` manages the tables declared in
-- `schema.ts`; Supabase Storage lives in the `storage` schema, which Drizzle
-- does not and should not know about. Putting it here anyway means the whole
-- database — tables and buckets — is reproducible from the repository rather
-- than from somebody's memory of which switches they flipped in a dashboard.
--
-- ── Why RLS at all, when the server uses the service-role key ──
--
-- The application's own client bypasses these policies, because it has already
-- done the authorisation: `requireUser()`, then an ownership check on the
-- application, then a path composed from ids it verified itself.
--
-- These policies are the second lock. If an anon or authenticated key ever ends
-- up somewhere it should not — a client bundle, a misconfigured integration, a
-- future feature that reaches for the browser SDK — the difference between a
-- mistake and a passport archive is whether these exist. Defence that lives
-- only in application code ends at the first missing `where` clause.

-- --------------------------------------------------------------------------
-- Buckets
-- --------------------------------------------------------------------------

-- `public = false` on both. There is no such thing as a passport scan that is
-- fine to leave publicly addressable, and a bucket flipped to public by
-- accident is not recoverable — the URLs are already out.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'incoming',
    'incoming',
    false,
    15728640, -- 15MB. Also checked when the upload ticket is issued, so a large
              -- file fails with a readable message before the upload rather
              -- than after it. This is the limit that actually binds.
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'documents',
    'documents',
    false,
    15728640,
    -- Only ever written by the normaliser, which always emits JPEG.
    array['image/jpeg']
  )
on conflict (id) do nothing;
--> statement-breakpoint

-- --------------------------------------------------------------------------
-- Policies
-- --------------------------------------------------------------------------

-- Everything is denied by default once RLS is on and no policy grants access.
-- The policies below grant nothing to `anon` and nothing to `authenticated`,
-- which is the intent stated explicitly rather than left implicit: there is no
-- path from a browser-held key to these objects at all. Access is exclusively
-- through signed URLs minted server-side, valid for sixty seconds.
alter table storage.objects enable row level security;
--> statement-breakpoint

drop policy if exists "no anon access to incoming" on storage.objects;
--> statement-breakpoint
create policy "no anon access to incoming"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id <> 'incoming')
  with check (bucket_id <> 'incoming');
--> statement-breakpoint

drop policy if exists "no anon access to documents" on storage.objects;
--> statement-breakpoint
create policy "no anon access to documents"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id <> 'documents')
  with check (bucket_id <> 'documents');
