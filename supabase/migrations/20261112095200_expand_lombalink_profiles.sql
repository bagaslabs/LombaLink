alter table public.lombalink_profiles
  add column username text,
  add column province text,
  add column city text,
  add column birth_date date,
  add column education text,
  add column avatar_url text,
  add column avatar_path text;

alter table public.lombalink_profiles
  add constraint lombalink_profiles_username_check
    check (username is null or username ~ '^[A-Za-z0-9._]{3,30}$'),
  add constraint lombalink_profiles_education_check
    check (education is null or education in ('SMP', 'SMA', 'Kuliah', 'Umum'));

create unique index lombalink_profiles_username_ci_idx
  on public.lombalink_profiles (lower(btrim(username)))
  where username is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lombalink-profile-photos',
  'lombalink-profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "LombaLink users upload own profile photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'lombalink-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "LombaLink users update own profile photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'lombalink-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'lombalink-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "LombaLink users delete own profile photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lombalink-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy "Complete members submit LombaLink competitions"
  on public.lombalink_competitions;

create policy "Complete members submit LombaLink competitions"
  on public.lombalink_competitions
  for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1
      from public.lombalink_profiles profile
      where profile.id = (select auth.uid())
        and nullif(btrim(profile.username), '') is not null
        and nullif(btrim(profile.full_name), '') is not null
        and nullif(btrim(profile.phone), '') is not null
        and nullif(btrim(profile.province), '') is not null
        and nullif(btrim(profile.city), '') is not null
        and profile.birth_date is not null
        and profile.education is not null
    )
  );
