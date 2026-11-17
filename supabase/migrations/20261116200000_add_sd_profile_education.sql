alter table public.lombalink_profiles
  drop constraint if exists lombalink_profiles_education_check;

alter table public.lombalink_profiles
  add constraint lombalink_profiles_education_check
  check (education is null or education in ('SD', 'SMP', 'SMA', 'Kuliah', 'Umum'));
