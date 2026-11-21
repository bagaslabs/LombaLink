create or replace function public.lombalink_log_deleted_report_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_competition_title text;
begin
  if coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'moderator'
    or auth.uid() is null
  then
    return old;
  end if;

  select competition.title
  into v_competition_title
  from public.lombalink_competitions competition
  where competition.id = old.competition_id;

  perform public.lombalink_write_admin_activity(
    'report_deleted',
    'report',
    old.id::text,
    coalesce(v_competition_title, 'Laporan lomba'),
    jsonb_build_object(
      'status', old.status,
      'reason', old.reason
    )
  );
  return old;
end;
$$;

revoke all on function public.lombalink_log_deleted_report_admin_activity()
  from public, anon, authenticated;

drop trigger if exists lombalink_log_deleted_report_admin_activity
  on public.lombalink_competition_reports;

create trigger lombalink_log_deleted_report_admin_activity
  before delete on public.lombalink_competition_reports
  for each row execute function public.lombalink_log_deleted_report_admin_activity();
