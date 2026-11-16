alter table public.lombalink_competitions
  add column if not exists rulebook_urls text[] not null default '{}'::text[],
  add column if not exists rulebook_links jsonb not null default '[]'::jsonb;

update public.lombalink_competitions
set rulebook_urls = array[rulebook_url]
where rulebook_url is not null and cardinality(rulebook_urls) = 0;

update public.lombalink_competitions as competition
set rulebook_links = (
  select coalesce(
    jsonb_agg(jsonb_build_object('name', 'Panduan ' || links.ordinality, 'url', links.url) order by links.ordinality),
    '[]'::jsonb
  )
  from unnest(competition.rulebook_urls) with ordinality as links(url, ordinality)
)
where cardinality(competition.rulebook_urls) > 0 and competition.rulebook_links = '[]'::jsonb;

create or replace function public.lombalink_protect_competition_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  registration_batch jsonb;
begin
  if coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'moderator' then
    if new.id is distinct from old.id
      or new.submitted_by is distinct from old.submitted_by
      or new.created_at is distinct from old.created_at
      or new.submitted_at is distinct from old.submitted_at
      or new.featured is distinct from old.featured
      or (new.status is distinct from old.status and not (old.status = 'draft' and new.status = 'pending'))
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
    then
      raise exception 'Only moderators may change competition ownership or review status.';
    end if;

    if old.status = 'draft' and new.status = 'pending' then
      if nullif(btrim(new.title), '') is null
        or nullif(btrim(new.description), '') is null
        or nullif(btrim(new.audience), '') is null
        or nullif(btrim(new.category), '') is null
        or nullif(btrim(new.education), '') is null
        or nullif(btrim(new.scope), '') is null
        or nullif(btrim(new.competition_type), '') is null
        or nullif(btrim(new.mode), '') is null
        or (new.mode <> 'Online' and nullif(btrim(new.location), '') is null)
        or new.deadline is null
        or nullif(btrim(new.organizer), '') is null
        or nullif(btrim(new.organizer_type), '') is null
        or nullif(btrim(new.organizer_level), '') is null
      then
        raise exception 'Complete the required competition information before submitting the draft.';
      end if;

      if jsonb_typeof(new.registration_batches) <> 'array'
        or jsonb_array_length(new.registration_batches) = 0
      then
        raise exception 'Add at least one registration batch before submitting the draft.';
      end if;

      for registration_batch in
        select batch from jsonb_array_elements(new.registration_batches) as batches(batch)
      loop
        if nullif(btrim(registration_batch ->> 'label'), '') is null
          or coalesce((registration_batch ->> 'startsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', true)
          or coalesce((registration_batch ->> 'endsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', true)
          or (registration_batch ->> 'endsAt') < (registration_batch ->> 'startsAt')
        then
          raise exception 'Complete each registration batch with a valid date range before submitting the draft.';
        end if;
      end loop;
    end if;

    if row(
      new.title, new.tagline, new.description, new.organizer, new.organizer_type,
      new.organizer_level, new.contact_person_name, new.contact_person_email,
      new.contact_person_phone, new.audience, new.education, new.scope, new.category,
      new.keywords, new.competition_type, new.mode, new.location, new.fee_tiers,
      new.prize, new.registration_batches, new.deadline, new.event_start_date,
      new.event_end_date, new.registration_url, new.information_url, new.rulebook_url,
      new.rulebook_urls, new.rulebook_links, new.benefits, new.cover_path, new.competition_category,
      new.participant_type, new.target_participants, new.requirements, new.fee_type,
      new.fee_amount, new.contact, new.contact_people, new.guidebook_path
    ) is distinct from row(
      old.title, old.tagline, old.description, old.organizer, old.organizer_type,
      old.organizer_level, old.contact_person_name, old.contact_person_email,
      old.contact_person_phone, old.audience, old.education, old.scope, old.category,
      old.keywords, old.competition_type, old.mode, old.location, old.fee_tiers,
      old.prize, old.registration_batches, old.deadline, old.event_start_date,
      old.event_end_date, old.registration_url, old.information_url, old.rulebook_url,
      old.rulebook_urls, old.rulebook_links, old.benefits, old.cover_path, old.competition_category,
      old.participant_type, old.target_participants, old.requirements, old.fee_type,
      old.fee_amount, old.contact, old.contact_people, old.guidebook_path
    ) and old.status in ('approved', 'rejected') then
      new.status := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.lombalink_validate_competition_form_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  should_validate boolean := false;
  registration_batch jsonb;
  contact_person jsonb;
  has_whatsapp boolean;
  has_gmail boolean;
  has_instagram boolean;
  has_tiktok boolean;
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
        new.rulebook_urls,
        new.rulebook_links,
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
        old.rulebook_urls,
        old.rulebook_links,
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
    or nullif(btrim(new.competition_category), '') is null
    or new.participant_type not in ('Individu', 'Tim', 'Individu dan Tim')
    or cardinality(new.target_participants) = 0
    or new.cover_path is null
    or (new.rulebook_url is not null and new.rulebook_url !~* '^https?://')
    or (new.rulebook_urls is not null and exists (
      select 1 from unnest(new.rulebook_urls) as url
      where nullif(btrim(url), '') is null or url !~* '^https?://'
    ))
    or (new.rulebook_links is not null and (
      jsonb_typeof(new.rulebook_links) <> 'array'
      or exists (
        select 1 from jsonb_array_elements(new.rulebook_links) as links(link)
        where nullif(btrim(links.link ->> 'name'), '') is null
          or nullif(btrim(links.link ->> 'url'), '') is null
          or links.link ->> 'url' !~* '^https?://'
      )
    ))
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
    has_whatsapp := coalesce(contact_person -> 'contactMethods' ? 'whatsapp', false)
      or nullif(btrim(contact_person ->> 'phone'), '') is not null;
    has_gmail := coalesce(contact_person -> 'contactMethods' ? 'gmail', false)
      or nullif(btrim(contact_person ->> 'email'), '') is not null;
    has_instagram := coalesce(contact_person -> 'contactMethods' ? 'instagram', false)
      or nullif(btrim(contact_person ->> 'instagramUsername'), '') is not null
      or nullif(btrim(contact_person ->> 'instagramUrl'), '') is not null;
    has_tiktok := coalesce(contact_person -> 'contactMethods' ? 'tiktok', false)
      or nullif(btrim(contact_person ->> 'tiktokUsername'), '') is not null
      or nullif(btrim(contact_person ->> 'tiktokUrl'), '') is not null;

    if not (has_whatsapp or has_gmail or has_instagram or has_tiktok)
      or (has_whatsapp and coalesce(contact_person ->> 'phone' !~ '^[+][1-9][0-9]{7,14}$', true))
      or (has_gmail and coalesce(contact_person ->> 'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$', true))
      or (has_instagram and nullif(btrim(contact_person ->> 'instagramUsername'), '') is null
        and nullif(btrim(contact_person ->> 'instagramUrl'), '') is null)
      or (nullif(btrim(contact_person ->> 'instagramUrl'), '') is not null
        and contact_person ->> 'instagramUrl' !~* '^https?://')
      or (has_tiktok and nullif(btrim(contact_person ->> 'tiktokUsername'), '') is null
        and nullif(btrim(contact_person ->> 'tiktokUrl'), '') is null)
      or (nullif(btrim(contact_person ->> 'tiktokUrl'), '') is not null
        and contact_person ->> 'tiktokUrl' !~* '^https?://')
    then
      raise exception 'Each competition contact must have valid details for its selected channel.';
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
