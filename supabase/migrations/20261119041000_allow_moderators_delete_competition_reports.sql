grant delete on table public.lombalink_competition_reports to authenticated;

drop policy if exists "Moderators delete LombaLink competition reports"
  on public.lombalink_competition_reports;

create policy "Moderators delete LombaLink competition reports"
  on public.lombalink_competition_reports
  for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator');
