create table public.lombalink_admin_activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  actor_name text not null,
  action text not null,
  entity_type text not null check (entity_type in ('competition', 'report', 'user')),
  entity_id text not null,
  entity_label text not null,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index lombalink_admin_activity_logs_created_at_idx
  on public.lombalink_admin_activity_logs (created_at desc);

alter table public.lombalink_admin_activity_logs enable row level security;

revoke all on table public.lombalink_admin_activity_logs from public, anon, authenticated;
grant select on table public.lombalink_admin_activity_logs to authenticated;
grant insert on table public.lombalink_admin_activity_logs to service_role;
grant usage, select on sequence public.lombalink_admin_activity_logs_id_seq to service_role;

create policy "Moderators read LombaLink admin activity logs"
  on public.lombalink_admin_activity_logs
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator');

create or replace function public.lombalink_write_admin_activity(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_entity_label text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_name text;
begin
  if v_actor_id is null
    or coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'moderator'
  then
    raise exception 'Only moderators may create admin activity logs.';
  end if;

  select nullif(btrim(profile.full_name), '')
  into v_actor_name
  from public.lombalink_profiles profile
  where profile.id = v_actor_id;

  insert into public.lombalink_admin_activity_logs (
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    entity_label,
    details
  )
  values (
    v_actor_id,
    coalesce(v_actor_name, 'Moderator'),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(nullif(btrim(p_entity_label), ''), p_entity_type),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.lombalink_write_admin_activity(text, text, text, text, jsonb)
  from public, anon, authenticated;

create or replace function public.lombalink_log_competition_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_details jsonb;
  v_changed_columns jsonb;
begin
  if coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'moderator'
    or auth.uid() is null
  then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_action := case when new.archived_at is null
      then 'competition_created'
      else 'competition_created_archived'
    end;
    v_details := jsonb_build_object(
      'status', new.status,
      'archived', new.archived_at is not null
    );
    perform public.lombalink_write_admin_activity(
      v_action,
      'competition',
      new.id::text,
      new.title,
      v_details
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.lombalink_write_admin_activity(
      'competition_deleted',
      'competition',
      old.id::text,
      old.title,
      jsonb_build_object('status', old.status, 'archived', old.archived_at is not null)
    );
    return old;
  end if;

  if new.status is distinct from old.status then
    v_action := 'competition_status_changed';
    v_details := jsonb_build_object(
      'before_status', old.status,
      'after_status', new.status
    );
  elsif new.archived_at is distinct from old.archived_at then
    v_action := case when new.archived_at is null
      then 'competition_restored'
      else 'competition_archived'
    end;
    v_details := jsonb_build_object('archived', new.archived_at is not null);
  else
    select coalesce(jsonb_agg(keys.column_name order by keys.column_name), '[]'::jsonb)
    into v_changed_columns
    from jsonb_object_keys(to_jsonb(new)) as keys(column_name)
    where (to_jsonb(old) -> keys.column_name) is distinct from (to_jsonb(new) -> keys.column_name);

    if v_changed_columns = '[]'::jsonb then return new; end if;
    v_action := 'competition_updated';
    v_details := jsonb_build_object('changed_fields', v_changed_columns);
  end if;

  perform public.lombalink_write_admin_activity(
    v_action,
    'competition',
    new.id::text,
    new.title,
    v_details
  );
  return new;
end;
$$;

revoke all on function public.lombalink_log_competition_admin_activity()
  from public, anon, authenticated;

create trigger lombalink_log_competition_admin_activity
  after insert or update or delete on public.lombalink_competitions
  for each row execute function public.lombalink_log_competition_admin_activity();

create or replace function public.lombalink_log_report_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_competition_title text;
begin
  if coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'moderator'
    or auth.uid() is null
    or new.status is not distinct from old.status
  then
    return new;
  end if;

  v_action := case new.status
    when 'resolved' then 'report_resolved'
    when 'dismissed' then 'report_dismissed'
    else 'report_reopened'
  end;

  select competition.title
  into v_competition_title
  from public.lombalink_competitions competition
  where competition.id = new.competition_id;

  perform public.lombalink_write_admin_activity(
    v_action,
    'report',
    new.id::text,
    coalesce(v_competition_title, 'Laporan lomba'),
    jsonb_build_object(
      'before_status', old.status,
      'after_status', new.status,
      'reason', new.reason
    )
  );
  return new;
end;
$$;

revoke all on function public.lombalink_log_report_admin_activity()
  from public, anon, authenticated;

create trigger lombalink_log_report_admin_activity
  after update on public.lombalink_competition_reports
  for each row execute function public.lombalink_log_report_admin_activity();
