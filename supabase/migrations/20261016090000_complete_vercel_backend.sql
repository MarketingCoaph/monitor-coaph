create or replace function public.sync_search_term_to_query()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.search_queries where query_text = old.term;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.term <> new.term then
    delete from public.search_queries where query_text = old.term;
  end if;
  insert into public.search_queries(query_text, weight, active, updated_at)
  values(new.term, coalesce(new.weight, 10), coalesce(new.active, 1) = 1, now())
  on conflict(query_text) do update set
    weight = excluded.weight, active = excluded.active, updated_at = now();
  return new;
end;
$$;

drop trigger if exists search_terms_sync_query on public.search_terms;
create trigger search_terms_sync_query
after insert or update or delete on public.search_terms
for each row execute function public.sync_search_term_to_query();

insert into public.search_queries(query_text, weight, active)
select term, coalesce(weight, 10), coalesce(active, 1) = 1 from public.search_terms
on conflict(query_text) do update set
  weight = excluded.weight, active = excluded.active, updated_at = now();

create index if not exists idx_news_relevance_published
  on public.news(relevance_status, published_at desc nulls last);
create index if not exists idx_news_title_lower on public.news(lower(title));

alter table public.news enable row level security;
alter table public.sources enable row level security;
alter table public.search_terms enable row level security;
alter table public.case_entities enable row level security;
alter table public.monitor_logs enable row level security;
alter table public.settings enable row level security;
alter table public.manual_reviews enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
revoke execute on function public.sync_search_term_to_query() from public, anon, authenticated;
grant execute on function public.sync_search_term_to_query() to service_role;

create index if not exists idx_candidate_news_query_run_id on public.candidate_news(query_run_id);
create index if not exists idx_candidate_news_source_id on public.candidate_news(source_id);
create index if not exists idx_news_candidate_id on public.news(candidate_id);
create index if not exists idx_news_query_matches_query_run_id on public.news_query_matches(query_run_id);
create index if not exists idx_news_query_matches_search_query_id on public.news_query_matches(search_query_id);
create index if not exists idx_query_runs_search_query_id on public.query_runs(search_query_id);
create index if not exists idx_query_runs_source_id on public.query_runs(source_id);
