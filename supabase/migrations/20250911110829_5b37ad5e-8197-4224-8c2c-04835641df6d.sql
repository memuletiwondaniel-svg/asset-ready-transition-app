-- Storage RLS policies for user avatar uploads
-- Allow public read access to avatars in the 'user-avatars' bucket
drop policy if exists "Public can view user avatars" on storage.objects;
create policy "Public can view user avatars"
  on storage.objects
  for select
  using (bucket_id = 'user-avatars');

-- Allow authenticated users to upload files to their own folder (/<user_id>/...)
drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update files in their own folder
drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete files in their own folder
drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );