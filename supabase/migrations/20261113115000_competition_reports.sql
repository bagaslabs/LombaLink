create table public.lombalink_competition_reports (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.lombalink_competitions (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in (
    'inaccurate_information',
    'registration_link_issue',
    'suspicious_competition',
    'competition_ended',
    'other'
  )),
  description text not null check (char_length(btrim(description)) between 10 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'dismissed')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  constraint lombalink_competition_reports_review_fields_check
    check (
      (status = 'pending' and reviewed_by is null and reviewed_at is null)
      or (status <> 'pending' and reviewed_at is not null)
    )
);

create index lombalink_competition_reports_status_idx
  on public.lombalink_competition_reports (status, submitted_at desc);

create unique index lombalink_competition_reports_one_open_per_user_idx
  on public.lombalink_competition_reports (competition_id, reporter_id)
  where status = 'pending';

alter table public.lombalink_competition_reports enable row level security;

revoke all on table public.lombalink_competition_reports from public, anon, authenticated;

create policy "Reporters and moderators read LombaLink competition reports"
  on public.lombalink_competition_reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator'
  );

create policy "Members report active LombaLink competitions"
  on public.lombalink_competition_reports
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1
      from public.lombalink_competitions competition
      where competition.id = public.lombalink_competition_reports.competition_id
        and competition.status = 'approved'
        and competition.archived_at is null
        and competition.submitted_by <> (select auth.uid())
    )
  );

create policy "Moderators review LombaLink competition reports"
  on public.lombalink_competition_reports
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator');

grant select, insert, update on public.lombalink_competition_reports to authenticated;
