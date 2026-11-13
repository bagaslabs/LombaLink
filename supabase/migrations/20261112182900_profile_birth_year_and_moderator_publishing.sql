alter table public.lombalink_profiles
  add column birth_year smallint;

update public.lombalink_profiles
set birth_year = extract(year from birth_date)::smallint
where birth_date is not null;

update public.lombalink_profiles profile
set birth_year = substring(user_record.raw_user_meta_data ->> 'birth_date', 1, 4)::smallint
from auth.users user_record
where profile.id = user_record.id
  and profile.birth_year is null
  and user_record.raw_user_meta_data ->> 'birth_date' ~ '^\d{4}-\d{2}-\d{2}$';

update auth.users user_record
set raw_user_meta_data = (
  coalesce(user_record.raw_user_meta_data, '{}'::jsonb) - 'birth_date'
) || case
  when profile.birth_year is not null then jsonb_build_object('birth_year', profile.birth_year)
  when user_record.raw_user_meta_data ->> 'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
    then jsonb_build_object('birth_year', substring(user_record.raw_user_meta_data ->> 'birth_date', 1, 4)::smallint)
  else '{}'::jsonb
end
from public.lombalink_profiles profile
where profile.id = user_record.id;

update auth.users user_record
set raw_user_meta_data = (
  coalesce(user_record.raw_user_meta_data, '{}'::jsonb) - 'birth_date'
) || case
  when user_record.raw_user_meta_data ->> 'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
    then jsonb_build_object('birth_year', substring(user_record.raw_user_meta_data ->> 'birth_date', 1, 4)::smallint)
  else '{}'::jsonb
end
where not exists (
  select 1
  from public.lombalink_profiles profile
  where profile.id = user_record.id
)
and user_record.raw_user_meta_data ? 'birth_date';

drop policy "Complete members submit LombaLink competitions"
  on public.lombalink_competitions;

alter table public.lombalink_profiles
  drop column birth_date;

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
        and profile.birth_year is not null
        and profile.education is not null
    )
  );

create policy "Moderators publish LombaLink competitions"
  on public.lombalink_competitions
  for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'moderator'
    and submitted_by = (select auth.uid())
    and status = 'approved'
    and reviewed_by = (select auth.uid())
    and reviewed_at is not null
  );
