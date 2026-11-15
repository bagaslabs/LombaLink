alter table public.lombalink_competitions
  add column contact_people jsonb not null default '[]'::jsonb
    check (jsonb_typeof(contact_people) = 'array'),
  add column team_min_members integer,
  add column team_max_members integer;

update public.lombalink_competitions
set contact_people = jsonb_build_array(jsonb_build_object(
  'name', coalesce(nullif(btrim(contact_person_name), ''), 'Kontak Penyelenggara'),
  'phone', coalesce(
    nullif(btrim(contact_person_phone), ''),
    case when contact ~ '^[+0-9 .()-]+$' then nullif(btrim(contact), '') end,
    ''
  ),
  'email', coalesce(nullif(btrim(contact_person_email), ''), ''),
  'instagramUsername', '',
  'instagramUrl', ''
))
where nullif(btrim(contact_person_name), '') is not null
  or nullif(btrim(contact_person_phone), '') is not null
  or nullif(btrim(contact_person_email), '') is not null
  or nullif(btrim(contact), '') is not null;

create or replace function public.lombalink_validate_competition_form_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  should_validate boolean := false;
  registration_batch jsonb;
  contact_person jsonb;
begin
  if tg_op = 'INSERT' then
    should_validate := new.status <> 'draft';
  else
    should_validate := old.status = 'draft' and new.status = 'pending'
      or row(
        new.title,
        new.tagline,
        new.description,
        new.organizer,
        new.organizer_type,
        new.organizer_level,
        new.contact,
        new.contact_person_name,
        new.contact_person_email,
        new.contact_person_phone,
        new.contact_people,
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
        new.cover_path,
        new.competition_category,
        new.participant_type,
        new.team_min_members,
        new.team_max_members,
        new.target_participants,
        new.requirements,
        new.fee_type,
        new.fee_amount,
        new.guidebook_path
      ) is distinct from row(
        old.title,
        old.tagline,
        old.description,
        old.organizer,
        old.organizer_type,
        old.organizer_level,
        old.contact,
        old.contact_person_name,
        old.contact_person_email,
        old.contact_person_phone,
        old.contact_people,
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
        old.cover_path,
        old.competition_category,
        old.participant_type,
        old.team_min_members,
        old.team_max_members,
        old.target_participants,
        old.requirements,
        old.fee_type,
        old.fee_amount,
        old.guidebook_path
      );

    if should_validate
      and old.status in ('approved', 'rejected')
      and new.status = old.status
      and coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'moderator'
    then
      new.status := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
  end if;

  if not should_validate or new.status = 'draft' then
    return new;
  end if;

  if nullif(btrim(new.title), '') is null
    or nullif(btrim(new.description), '') is null
    or nullif(btrim(new.organizer), '') is null
    or nullif(btrim(new.organizer_type), '') is null
    or nullif(btrim(new.organizer_level), '') is null
    or nullif(btrim(new.category), '') is null
    or nullif(btrim(new.scope), '') is null
    or nullif(btrim(new.mode), '') is null
    or (new.mode <> 'Online' and nullif(btrim(new.location), '') is null)
    or new.deadline is null
    or nullif(btrim(new.registration_url), '') is null
    or new.registration_url !~* '^https?://'
    or nullif(btrim(new.contact), '') is null
    or nullif(btrim(new.contact_person_name), '') is null
    or nullif(btrim(new.contact_person_phone), '') is null
    or nullif(btrim(new.competition_category), '') is null
    or new.participant_type not in ('Individu', 'Tim')
    or cardinality(new.target_participants) = 0
    or new.cover_path is null
    or (new.rulebook_url is not null and new.rulebook_url !~* '^https?://')
    or (
      new.participant_type = 'Tim'
      and (
        new.team_min_members is null
        or new.team_max_members is null
        or new.team_min_members < 1
        or new.team_max_members < 1
        or new.team_max_members < new.team_min_members
      )
    )
    or jsonb_typeof(new.contact_people) <> 'array'
    or jsonb_array_length(new.contact_people) = 0
    or jsonb_typeof(new.registration_batches) <> 'array'
    or jsonb_array_length(new.registration_batches) = 0
  then
    raise exception 'Complete the required competition information before submitting.';
  end if;

  for contact_person in
    select person
    from jsonb_array_elements(new.contact_people) as contacts(person)
  loop
    if nullif(btrim(contact_person ->> 'name'), '') is null
      or coalesce(contact_person ->> 'phone' !~ '^\+[1-9][0-9]{7,14}$', true)
      or (
        nullif(btrim(contact_person ->> 'email'), '') is not null
        and contact_person ->> 'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
      or (
        nullif(btrim(contact_person ->> 'instagramUrl'), '') is not null
        and contact_person ->> 'instagramUrl' !~* '^https?://'
      )
    then
      raise exception 'Each competition contact must have a valid name and phone number.';
    end if;
  end loop;

  for registration_batch in
    select batch
    from jsonb_array_elements(new.registration_batches) as batches(batch)
  loop
    if nullif(btrim(registration_batch ->> 'label'), '') is null
      or coalesce((registration_batch ->> 'startsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', true)
      or coalesce((registration_batch ->> 'endsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', true)
      or (registration_batch ->> 'endsAt') < (registration_batch ->> 'startsAt')
      or coalesce(registration_batch ->> 'feeType' not in ('Gratis', 'Berbayar'), true)
      or (
        registration_batch ->> 'feeType' = 'Berbayar'
        and (
          coalesce(registration_batch ->> 'feeAmount' !~ '^[0-9]+$', true)
          or (registration_batch ->> 'feeAmount')::numeric < 0
        )
      )
    then
      raise exception 'Each registration batch must have valid dates and a valid fee.';
    end if;
  end loop;

  return new;
end;
$$;

create trigger zz_lombalink_validate_competition_form_fields
  before insert or update on public.lombalink_competitions
  for each row execute function public.lombalink_validate_competition_form_fields();
