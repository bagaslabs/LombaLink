alter table public.lombalink_competitions
  add column tagline text not null default '',
  add column audience text not null default '',
  add column keywords text[] not null default '{}',
  add column competition_type text not null default '',
  add column organizer_level text not null default '',
  add column contact_person_name text not null default '',
  add column contact_person_email text,
  add column contact_person_phone text,
  add column fee_tiers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(fee_tiers) = 'array'),
  add column registration_batches jsonb not null default '[]'::jsonb
    check (jsonb_typeof(registration_batches) = 'array'),
  add column event_start_date date,
  add column event_end_date date,
  add column information_url text,
  add column rulebook_url text,
  add column benefits text not null default '',
  add column cover_path text,
  add column archived_at timestamptz;

alter table public.lombalink_competitions
  add constraint lombalink_competitions_event_dates_check
    check (event_end_date is null or event_start_date is null or event_end_date >= event_start_date);

drop policy if exists "Anyone reads approved LombaLink competitions"
  on public.lombalink_competitions;

create policy "Public reads active approved LombaLink competitions"
  on public.lombalink_competitions
  for select
  to anon, authenticated
  using (
    (status = 'approved' and archived_at is null)
    or submitted_by = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator'
  );

drop policy if exists "Owners update own LombaLink competitions"
  on public.lombalink_competitions;

create policy "Owners update own LombaLink competitions"
  on public.lombalink_competitions
  for update
  to authenticated
  using (submitted_by = (select auth.uid()))
  with check (submitted_by = (select auth.uid()));

drop policy if exists "Owners delete own LombaLink competitions"
  on public.lombalink_competitions;

create policy "Owners delete own LombaLink competitions"
  on public.lombalink_competitions
  for delete
  to authenticated
  using (
    submitted_by = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator'
  );

create or replace function public.lombalink_protect_competition_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'moderator' then
    if new.id is distinct from old.id
      or new.submitted_by is distinct from old.submitted_by
      or new.created_at is distinct from old.created_at
      or new.submitted_at is distinct from old.submitted_at
      or new.featured is distinct from old.featured
      or new.status is distinct from old.status
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
    then
      raise exception 'Only moderators may change competition ownership or review status.';
    end if;

    if row(
      new.title,
      new.tagline,
      new.description,
      new.organizer,
      new.organizer_type,
      new.organizer_level,
      new.contact_person_name,
      new.contact_person_email,
      new.contact_person_phone,
      new.audience,
      new.education,
      new.scope,
      new.category,
      new.keywords,
      new.competition_type,
      new.mode,
      new.location,
      new.fee_tiers,
      new.prize,
      new.registration_batches,
      new.deadline,
      new.event_start_date,
      new.event_end_date,
      new.registration_url,
      new.information_url,
      new.rulebook_url,
      new.benefits,
      new.cover_path
    ) is distinct from row(
      old.title,
      old.tagline,
      old.description,
      old.organizer,
      old.organizer_type,
      old.organizer_level,
      old.contact_person_name,
      old.contact_person_email,
      old.contact_person_phone,
      old.audience,
      old.education,
      old.scope,
      old.category,
      old.keywords,
      old.competition_type,
      old.mode,
      old.location,
      old.fee_tiers,
      old.prize,
      old.registration_batches,
      old.deadline,
      old.event_start_date,
      old.event_end_date,
      old.registration_url,
      old.information_url,
      old.rulebook_url,
      old.benefits,
      old.cover_path
    ) and old.status <> 'pending'
    then
      new.status := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists lombalink_protect_competition_review
  on public.lombalink_competitions;

create trigger lombalink_protect_competition_review
  before update on public.lombalink_competitions
  for each row execute function public.lombalink_protect_competition_review();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lombalink-competition-covers',
  'lombalink-competition-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "LombaLink public reads competition covers"
  on storage.objects;

create policy "LombaLink public reads competition covers"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'lombalink-competition-covers');

drop policy if exists "LombaLink users upload own competition covers"
  on storage.objects;

create policy "LombaLink users upload own competition covers"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'lombalink-competition-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "LombaLink users delete own competition covers"
  on storage.objects;

create policy "LombaLink users delete own competition covers"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lombalink-competition-covers'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator'
    )
  );

create table public.lombalink_competition_events (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.lombalink_competitions (id) on delete cascade,
  event_type text not null check (event_type in ('view', 'registration_click')),
  visitor_id uuid not null,
  event_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint lombalink_competition_events_unique_daily_visitor
    unique (competition_id, event_type, visitor_id, event_date)
);

create index lombalink_competition_events_competition_idx
  on public.lombalink_competition_events (competition_id, event_type);

alter table public.lombalink_competition_events enable row level security;

revoke all on table public.lombalink_competition_events from public, anon, authenticated;

create or replace function public.lombalink_track_competition_event(
  p_competition_id uuid,
  p_event_type text,
  p_visitor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_type not in ('view', 'registration_click') or p_visitor_id is null then
    raise exception 'Invalid competition analytics event.';
  end if;

  insert into public.lombalink_competition_events (
    competition_id,
    event_type,
    visitor_id
  )
  select competition.id, p_event_type, p_visitor_id
  from public.lombalink_competitions competition
  where competition.id = p_competition_id
    and competition.status = 'approved'
    and competition.archived_at is null
  on conflict (competition_id, event_type, visitor_id, event_date) do nothing;
end;
$$;

revoke all on function public.lombalink_track_competition_event(uuid, text, uuid) from public;
grant execute on function public.lombalink_track_competition_event(uuid, text, uuid) to anon, authenticated;

create or replace function public.lombalink_my_competition_analytics()
returns table (
  competition_id uuid,
  views bigint,
  registration_clicks bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    competition.id,
    count(event.id) filter (where event.event_type = 'view'),
    count(event.id) filter (where event.event_type = 'registration_click')
  from public.lombalink_competitions competition
  left join public.lombalink_competition_events event
    on event.competition_id = competition.id
  where competition.submitted_by = (select auth.uid())
  group by competition.id;
$$;

revoke all on function public.lombalink_my_competition_analytics() from public, anon;
grant execute on function public.lombalink_my_competition_analytics() to authenticated;

grant select, insert, update, delete on public.lombalink_competitions to authenticated;
