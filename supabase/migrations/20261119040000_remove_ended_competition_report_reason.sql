alter table public.lombalink_competition_reports
  drop constraint if exists lombalink_competition_reports_reason_check;

update public.lombalink_competition_reports
  set reason = 'other'
  where reason = 'competition_ended';

alter table public.lombalink_competition_reports
  add constraint lombalink_competition_reports_reason_check
  check (reason in (
    'inaccurate_information',
    'registration_link_issue',
    'suspicious_competition',
    'other'
  ));
