-- Keep the Battle Due image bucket reproducible across environments.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'battle-due-images',
  'battle-due-images',
  true,
  5242880,
  array['image/webp', 'image/png', 'image/jpeg', 'image/gif']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Only authenticated users with an admin profile may upload.
drop policy if exists "Battle Due admins can upload images" on storage.objects;

create policy "Battle Due admins can upload images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'battle-due-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);
