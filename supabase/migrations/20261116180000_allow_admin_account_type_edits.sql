create or replace function public.lombalink_prevent_account_type_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.account_type is not null
    and new.account_type is distinct from old.account_type
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'moderator'
    and current_user <> 'service_role' then
    raise exception using
      errcode = '23514',
      message = 'Account role is permanent and cannot be changed.';
  end if;
  return new;
end;
$$;
