alter table public.lombalink_profiles
  add column account_type text;

update public.lombalink_profiles profile
set account_type = case
  when user_record.raw_user_meta_data ->> 'account_type' in ('participant', 'organizer')
    then user_record.raw_user_meta_data ->> 'account_type'
  when user_record.raw_user_meta_data -> 'account_types' ->> 0 in ('participant', 'organizer')
    then user_record.raw_user_meta_data -> 'account_types' ->> 0
  when user_record.raw_user_meta_data -> 'account_types' ->> 1 in ('participant', 'organizer')
    then user_record.raw_user_meta_data -> 'account_types' ->> 1
  else null
end
from auth.users user_record
where profile.id = user_record.id;

alter table public.lombalink_profiles
  add constraint lombalink_profiles_account_type_check
    check (account_type is null or account_type in ('participant', 'organizer'));

create function public.lombalink_prevent_account_type_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.account_type is not null and new.account_type is distinct from old.account_type then
    raise exception using
      errcode = '23514',
      message = 'Account role is permanent and cannot be changed.';
  end if;
  return new;
end;
$$;

create trigger lombalink_profiles_account_type_immutable
  before update of account_type on public.lombalink_profiles
  for each row execute function public.lombalink_prevent_account_type_change();

create function public.lombalink_select_account_type(p_account_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_account_type text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'An authenticated user is required.';
  end if;

  if p_account_type is null or p_account_type not in ('participant', 'organizer') then
    raise exception using errcode = '22023', message = 'Choose a valid account role.';
  end if;

  select profile.account_type
  into saved_account_type
  from public.lombalink_profiles profile
  where profile.id = auth.uid()
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'The user profile does not exist.';
  end if;

  if saved_account_type is null then
    update public.lombalink_profiles profile
    set account_type = p_account_type
    where profile.id = auth.uid()
    returning profile.account_type into saved_account_type;
  elsif saved_account_type <> p_account_type then
    raise exception using
      errcode = '23514',
      message = 'Account role is permanent and cannot be changed.';
  end if;

  return saved_account_type;
end;
$$;

revoke all on function public.lombalink_prevent_account_type_change() from public, anon, authenticated;
revoke all on function public.lombalink_select_account_type(text) from public, anon;
grant execute on function public.lombalink_select_account_type(text) to authenticated;
