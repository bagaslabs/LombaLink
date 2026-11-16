-- Keep this repair idempotent: some deployed databases may have recorded the
-- multi-link feature migration without exposing both columns to PostgREST.
alter table public.lombalink_competitions
  add column if not exists rulebook_urls text[] not null default '{}'::text[],
  add column if not exists rulebook_links jsonb not null default '[]'::jsonb;

update public.lombalink_competitions
set rulebook_urls = array[rulebook_url]
where rulebook_url is not null
  and cardinality(rulebook_urls) = 0;

update public.lombalink_competitions as competition
set rulebook_links = (
  select coalesce(
    jsonb_agg(jsonb_build_object('name', 'Panduan ' || links.ordinality, 'url', links.url) order by links.ordinality),
    '[]'::jsonb
  )
  from unnest(competition.rulebook_urls) with ordinality as links(url, ordinality)
)
where cardinality(competition.rulebook_urls) > 0
  and competition.rulebook_links = '[]'::jsonb;

notify pgrst, 'reload schema';
