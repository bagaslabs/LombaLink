alter table public.lombalink_competitions
  drop constraint if exists lombalink_competitions_status_check,
  add constraint lombalink_competitions_status_check
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  drop constraint if exists lombalink_competitions_review_fields_check,
  add constraint lombalink_competitions_review_fields_check
    check (
      (status in ('draft', 'pending') and reviewed_by is null and reviewed_at is null)
      or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
    ),
  drop constraint if exists lombalink_competitions_education_check,
  add constraint lombalink_competitions_education_check
    check (
      (status = 'draft' and (education = '' or education in ('SMP', 'SMA', 'Kuliah', 'Umum')))
      or (status <> 'draft' and education in ('SMP', 'SMA', 'Kuliah', 'Umum'))
    ),
  drop constraint if exists lombalink_competitions_scope_check,
  add constraint lombalink_competitions_scope_check
    check (
      (status = 'draft' and (scope = '' or scope in ('Daerah', 'Provinsi', 'Nasional', 'Internasional')))
      or (status <> 'draft' and scope in ('Daerah', 'Provinsi', 'Nasional', 'Internasional'))
    ),
  drop constraint if exists lombalink_competitions_organizer_type_check,
  add constraint lombalink_competitions_organizer_type_check
    check (
      (status = 'draft' and (organizer_type = '' or organizer_type in ('Pemerintah', 'Universitas', 'Lembaga umum', 'Komunitas')))
      or (status <> 'draft' and organizer_type in ('Pemerintah', 'Universitas', 'Lembaga umum', 'Komunitas'))
    ),
  alter column deadline drop not null;

drop policy if exists "Complete members submit LombaLink competitions"
  on public.lombalink_competitions;

create policy "Complete members submit LombaLink competitions"
  on public.lombalink_competitions
  for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status in ('draft', 'pending')
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
        raise exception 'Add at least one registration batch before submitting the draft.';
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
          raise exception 'Complete each registration batch with a valid date range before submitting the draft.';
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
      new.cover_path
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
      old.cover_path
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
