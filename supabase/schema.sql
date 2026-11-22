-- PostKit — schema Supabase (già applicato al progetto "postkit", regione eu-central-2 Zurigo)
-- Principio: il browser NON può leggere né modificare le tabelle.
-- Può solo chiamare 4 funzioni RPC che validano i dati e limitano lo spam.

-- ---------- Tabelle ----------
create table public.visitors (
  id uuid primary key,                 -- UUID casuale generato dal browser
  name text,
  email text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visits integer not null default 1,
  platform text,
  user_agent text,
  lang text
);

create table public.events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  module text not null,
  event_type text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index events_visitor_idx on public.events(visitor_id);
create index events_created_idx on public.events(created_at);

create table public.ratings (
  id bigint generated always as identity primary key,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  module text not null,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index ratings_visitor_idx on public.ratings(visitor_id);
create index ratings_created_idx on public.ratings(created_at);

alter table public.visitors enable row level security;
alter table public.events enable row level security;
alter table public.ratings enable row level security;
revoke all on public.visitors, public.events, public.ratings from anon, authenticated;

-- ---------- Funzioni RPC (unico punto di scrittura) ----------
create or replace function public.pk_touch_visitor(
  p_id uuid, p_platform text default null, p_user_agent text default null, p_lang text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.visitors(id, platform, user_agent, lang)
  values (p_id, left(p_platform, 40), left(p_user_agent, 400), left(p_lang, 20))
  on conflict (id) do update
    set last_seen = now(),
        visits = public.visitors.visits + case when public.visitors.last_seen < now() - interval '30 minutes' then 1 else 0 end,
        platform = coalesce(excluded.platform, public.visitors.platform),
        user_agent = coalesce(excluded.user_agent, public.visitors.user_agent),
        lang = coalesce(excluded.lang, public.visitors.lang);
end $$;

create or replace function public.pk_register(p_id uuid, p_name text, p_email text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_name text := btrim(p_name); v_email text := lower(btrim(p_email));
begin
  if v_name is null or length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'invalid name';
  end if;
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  insert into public.visitors(id, name, email) values (p_id, v_name, v_email)
  on conflict (id) do update set name = excluded.name, email = excluded.email, last_seen = now();
end $$;

create or replace function public.pk_track(p_id uuid, p_module text, p_event text, p_meta jsonb default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- anti-spam: max 300 eventi per visitatore per ora
  if (select count(*) from public.events where visitor_id = p_id and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  if not exists (select 1 from public.visitors where id = p_id) then
    insert into public.visitors(id) values (p_id);
  end if;
  insert into public.events(visitor_id, module, event_type, meta)
  values (p_id, left(p_module, 40), left(p_event, 40),
          case when p_meta is null or length(p_meta::text) > 2000 then null else p_meta end);
end $$;

create or replace function public.pk_rate(p_id uuid, p_module text, p_score int, p_comment text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_score < 1 or p_score > 5 then raise exception 'invalid score'; end if;
  -- anti-spam: max 10 valutazioni per visitatore al giorno
  if (select count(*) from public.ratings where visitor_id = p_id and created_at > now() - interval '1 day') >= 10 then
    return;
  end if;
  if not exists (select 1 from public.visitors where id = p_id) then
    insert into public.visitors(id) values (p_id);
  end if;
  insert into public.ratings(visitor_id, module, score, comment)
  values (p_id, left(p_module, 40), p_score, nullif(left(btrim(p_comment), 1000), ''));
end $$;

revoke all on function public.pk_touch_visitor(uuid, text, text, text) from public;
revoke all on function public.pk_register(uuid, text, text) from public;
revoke all on function public.pk_track(uuid, text, text, jsonb) from public;
revoke all on function public.pk_rate(uuid, text, int, text) from public;
grant execute on function public.pk_touch_visitor(uuid, text, text, text) to anon, authenticated;
grant execute on function public.pk_register(uuid, text, text) to anon, authenticated;
grant execute on function public.pk_track(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.pk_rate(uuid, text, int, text) to anon, authenticated;

-- ---------- Viste statistiche (solo proprietario, dalla dashboard) ----------
create view public.stats_daily with (security_invoker = true) as
select date_trunc('day', created_at)::date as day, module, event_type, count(*) as n,
       count(distinct visitor_id) as visitors
from public.events group by 1,2,3 order by 1 desc;

create view public.stats_ratings with (security_invoker = true) as
select module, count(*) as n, round(avg(score)::numeric, 2) as avg_score
from public.ratings group by 1;

create view public.stats_overview with (security_invoker = true) as
select
  (select count(*) from public.visitors) as visitatori_totali,
  (select count(*) from public.visitors where email is not null) as registrati,
  (select count(*) from public.visitors where last_seen > now() - interval '7 days') as attivi_7_giorni,
  (select count(*) from public.events where event_type = 'export') as immagini_create,
  (select count(*) from public.events where event_type = 'save') as salvataggi,
  (select round(avg(score)::numeric, 2) from public.ratings) as voto_medio,
  (select count(*) from public.ratings) as valutazioni;

create view public.stats_platform with (security_invoker = true) as
select coalesce(platform, '?') as piattaforma, count(*) as visitatori
from public.visitors group by 1 order by 2 desc;

create view public.stats_users with (security_invoker = true) as
select v.name as nome, v.email, v.platform as piattaforma, v.visits as visite,
       v.first_seen as prima_visita, v.last_seen as ultima_visita,
       (select count(*) from public.events e where e.visitor_id = v.id and e.event_type = 'export') as immagini
from public.visitors v where v.email is not null order by v.last_seen desc;

create view public.stats_feedback with (security_invoker = true) as
select r.created_at as data, r.module as strumento, r.score as voto, r.comment as commento, v.name as nome
from public.ratings r left join public.visitors v on v.id = r.visitor_id
order by r.created_at desc;

revoke all on public.stats_daily, public.stats_ratings, public.stats_overview,
  public.stats_platform, public.stats_users, public.stats_feedback from anon, authenticated;
