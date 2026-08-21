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
-- Policies — asserted, not created, and the difference matters
-- --------------------------------------------------------------------------
--
-- This section previously ran `alter table storage.objects enable row level
-- security` and created two policies. Neither can work, and the second was
-- worse than not working.
--
-- ── Why it cannot run ──
--
-- Supabase owns `storage.objects` as `supabase_storage_admin`. `alter table`
-- and `create policy` both require table ownership, so the migration failed on
-- a fresh project with `42501: must be owner of table objects` — after the
-- buckets had already been inserted, leaving the schema half-applied.
--
-- ── Why it was wrong anyway ──
--
-- The two policies were PERMISSIVE, and permissive policies OR together. For a
-- row in `incoming`: "bucket_id <> 'incoming'" is false, "bucket_id <>
-- 'documents'" is TRUE, and false OR true grants access. Two policies each
-- named "no anon access" would together have handed `anon` read and write on
-- both buckets of passport scans. Restrictive policies (`as restrictive`) AND
-- together and were what the intent required — but that is moot, because we
-- cannot create either kind here.
--
-- ── What actually protects these objects ──
--
-- Supabase enables RLS on `storage.objects` by default, and RLS with no
-- permissive policy is deny-all. `anon` and `authenticated` therefore have no
-- path to these objects at all. The server reaches them with the service-role
-- key, which bypasses RLS, and hands out sixty-second signed URLs.
--
-- That property is a default, which means it is exactly the kind of thing that
-- is true until somebody clicks something in a dashboard. So rather than
-- pretend to create it, this migration checks it — reading `pg_class` and
-- `pg_policies` needs no ownership. RLS switched off is fatal here; a
-- permissive policy is a warning, because a later bucket may legitimately have
-- one and only a human can say whether it touches these two.
do $$
declare
  rls_on boolean;
  offenders text;
begin
  select relrowsecurity into rls_on from pg_class where oid = 'storage.objects'::regclass;

  if not rls_on then
    raise exception
      'RLS is disabled on storage.objects. Every object in `incoming` and '
      '`documents` is readable by any holder of the anon key. Re-enable it in '
      'the Supabase dashboard before continuing.';
  end if;

  select string_agg(policyname, ', ') into offenders
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and permissive = 'PERMISSIVE'
    and (roles::text[] && array['anon', 'authenticated', 'public']);

  if offenders is not null then
    raise warning
      'Permissive policies on storage.objects grant anon or authenticated '
      'access: %. Confirm none of them match bucket_id in (''incoming'', '
      '''documents'') — permissive policies OR together.', offenders;
  end if;
end
$$;
