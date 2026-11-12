create table public.lombalink_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  region text not null default '',
  institution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lombalink_competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer text not null,
  organizer_type text not null default 'Lembaga umum'
    check (organizer_type in ('Pemerintah', 'Universitas', 'Lembaga umum', 'Komunitas')),
  category text not null,
  education text not null check (education in ('SMP', 'SMA', 'Kuliah', 'Umum')),
  scope text not null check (scope in ('Daerah', 'Provinsi', 'Nasional', 'Internasional')),
  location text not null default 'Online',
  deadline date not null,
  prize text not null default 'Informasi hadiah belum ditambahkan',
  mode text not null default 'Online',
  description text not null default '',
  registration_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid not null references auth.users (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lombalink_competitions_review_fields_check
    check (
      (status = 'pending' and reviewed_by is null and reviewed_at is null)
      or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)
    )
);

create index lombalink_competitions_public_deadline_idx
  on public.lombalink_competitions (deadline)
  where status = 'approved';

create index lombalink_competitions_submitter_idx
  on public.lombalink_competitions (submitted_by, submitted_at desc);

create function public.lombalink_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.lombalink_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lombalink_profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger lombalink_profiles_set_updated_at
  before update on public.lombalink_profiles
  for each row execute function public.lombalink_set_updated_at();

create trigger lombalink_competitions_set_updated_at
  before update on public.lombalink_competitions
  for each row execute function public.lombalink_set_updated_at();

create trigger lombalink_create_profile_after_signup
  after insert on auth.users
  for each row execute function public.lombalink_create_profile_for_new_user();

alter table public.lombalink_profiles enable row level security;
alter table public.lombalink_competitions enable row level security;

create policy "Users read own LombaLink profile"
  on public.lombalink_profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator'
  );

create policy "Users create own LombaLink profile"
  on public.lombalink_profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Users update own LombaLink profile"
  on public.lombalink_profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Anyone reads approved LombaLink competitions"
  on public.lombalink_competitions
  for select
  to anon, authenticated
  using (
    status = 'approved'
    or submitted_by = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator'
  );

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
        and nullif(btrim(profile.full_name), '') is not null
        and nullif(btrim(profile.phone), '') is not null
        and nullif(btrim(profile.region), '') is not null
    )
  );

create policy "Moderators review LombaLink competitions"
  on public.lombalink_competitions
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator');

grant select, insert, update on public.lombalink_profiles to authenticated;
grant select on public.lombalink_competitions to anon, authenticated;
grant insert, update on public.lombalink_competitions to authenticated;

revoke all on function public.lombalink_create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.lombalink_set_updated_at() from public, anon, authenticated;
