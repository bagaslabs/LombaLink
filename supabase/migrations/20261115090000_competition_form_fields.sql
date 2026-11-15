alter table public.lombalink_competitions
  add column competition_category text not null default '',
  add column participant_type text not null default '',
  add column target_participants text[] not null default '{}',
  add column requirements text not null default '',
  add column fee_type text not null default 'Gratis',
  add column fee_amount numeric,
  add column contact text not null default '',
  add column guidebook_path text;

update public.lombalink_competitions
set target_participants = case education
  when 'SMP' then array['SMP / MTs']::text[]
  when 'SMA' then array['SMA / SMK / MA']::text[]
  when 'Kuliah' then array['Mahasiswa']::text[]
  else array['Umum']::text[]
end
where cardinality(target_participants) = 0;

update public.lombalink_competitions
set contact = coalesce(
  nullif(btrim(contact_person_phone), ''),
  nullif(btrim(contact_person_email), ''),
  nullif(btrim(contact_person_name), ''),
  ''
);

update public.lombalink_competitions
set fee_type = case
      when jsonb_array_length(fee_tiers) > 0
        and (fee_tiers -> 0 ->> 'amount') ~ '^[0-9]+([.][0-9]+)?$'
        then 'Berbayar'
      else 'Gratis'
    end,
    fee_amount = case
      when jsonb_array_length(fee_tiers) > 0
        and (fee_tiers -> 0 ->> 'amount') ~ '^[0-9]+([.][0-9]+)?$'
        then (fee_tiers -> 0 ->> 'amount')::numeric
      else null
    end;

alter table public.lombalink_competitions
  drop constraint if exists lombalink_competitions_scope_check,
  add constraint lombalink_competitions_scope_check
    check (
      (status = 'draft' and (
        scope = ''
        or scope in ('Daerah', 'Kabupaten/Kota', 'Provinsi', 'Nasional', 'Internasional')
      ))
      or (status <> 'draft' and scope in ('Daerah', 'Kabupaten/Kota', 'Provinsi', 'Nasional', 'Internasional'))
    ),
  add constraint lombalink_competitions_category_group_check
    check (competition_category in ('', 'Akademik', 'Non-akademik')),
  add constraint lombalink_competitions_participant_type_check
    check (participant_type in ('', 'Individu', 'Tim', 'Individu dan Tim')),
  add constraint lombalink_competitions_target_participants_check
    check (
      target_participants <@ array['SD / MI', 'SMP / MTs', 'SMA / SMK / MA', 'Mahasiswa', 'Umum']::text[]
      and (status = 'draft' or cardinality(target_participants) > 0)
    ),
  add constraint lombalink_competitions_fee_type_check
    check (
      (status = 'draft' and (
        (fee_type = '' and fee_amount is null)
        or
        (fee_type = 'Gratis' and fee_amount is null)
        or (fee_type = 'Berbayar' and (fee_amount is null or fee_amount >= 0))
      ))
      or (status <> 'draft' and (
        (fee_type = 'Gratis' and fee_amount is null)
        or (fee_type = 'Berbayar' and fee_amount is not null and fee_amount >= 0)
      ))
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lombalink-competition-covers',
  'lombalink-competition-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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
      or (
        new.status is distinct from old.status
        and not (old.status = 'draft' and new.status = 'pending')
      )
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
        or nullif(btrim(new.contact_person_name), '') is null
        or nullif(btrim(new.contact), '') is null
        or nullif(btrim(new.registration_url), '') is null
        or new.registration_url !~* '^https?://'
        or nullif(btrim(new.competition_category), '') is null
        or new.participant_type not in ('Individu', 'Tim', 'Individu dan Tim')
        or cardinality(new.target_participants) = 0
        or new.cover_path is null
        or (new.fee_type = 'Berbayar' and (new.fee_amount is null or new.fee_amount < 0))
        or (
          nullif(btrim(new.contact_person_email), '') is null
          and nullif(btrim(new.contact_person_phone), '') is null
        )
        or (
          nullif(btrim(new.contact_person_email), '') is not null
          and new.contact_person_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        )
      then
        raise exception 'Complete the required competition information before submitting the draft.';
      end if;

      if jsonb_typeof(new.registration_batches) <> 'array'
        or jsonb_array_length(new.registration_batches) = 0
      then
        raise exception 'Add a registration period before submitting the draft.';
      end if;

      for registration_batch in
        select batch
        from jsonb_array_elements(new.registration_batches) as batches(batch)
      loop
        if nullif(btrim(registration_batch ->> 'label'), '') is null
          or coalesce((registration_batch ->> 'startsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', true)
          or coalesce((registration_batch ->> 'endsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', true)
          or (registration_batch ->> 'endsAt') < (registration_batch ->> 'startsAt')
        then
          raise exception 'Complete the registration dates before submitting the draft.';
        end if;
      end loop;
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
      new.cover_path,
      new.competition_category,
      new.participant_type,
      new.target_participants,
      new.requirements,
      new.fee_type,
      new.fee_amount,
      new.contact,
      new.guidebook_path
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
      old.cover_path,
      old.competition_category,
      old.participant_type,
      old.target_participants,
      old.requirements,
      old.fee_type,
      old.fee_amount,
      old.contact,
      old.guidebook_path
    ) and old.status in ('approved', 'rejected')
    then
      new.status := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
  end if;

  return new;
end;
$$;
