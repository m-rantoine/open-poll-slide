-- Several sites (one per course) can share one database. A site sets a label, and the sessions it
-- starts carry it, so each site lists and joins only its own sessions. Sessions without a label
-- (older ones, or from a site that sets none) stay visible to the sites that have their deck.

alter table public.sessions add column site text
  check (site is null or site ~ '^[a-z0-9][a-z0-9._-]{0,39}$');

create function public.create_site_session(
  p_deck_id text,
  p_deck_title text,
  p_mode public.session_mode,
  p_page_count int,
  p_questions jsonb,
  p_site text
) returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  label text := nullif(lower(btrim(coalesce(p_site, ''))), '');
begin
  if label is not null and label !~ '^[a-z0-9][a-z0-9._-]{0,39}$' then
    raise exception 'invalid_site' using errcode = '22023';
  end if;
  s := public.create_session(p_deck_id, p_deck_title, p_mode, p_page_count, p_questions);
  update public.sessions set site = label where id = s.id returning * into s;
  return s;
end $$;

-- Joining from a site that is not the session's own is refused, the same as an unknown code.
create function public.join_site_session(p_code text, p_site text) returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  found_site text;
  label text := nullif(lower(btrim(coalesce(p_site, ''))), '');
begin
  select s.site into found_site from public.sessions s where s.code = upper(trim(p_code));
  if found_site is not null and found_site is distinct from label then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  return public.join_session(p_code);
end $$;

drop function public.list_active_sessions();
create function public.list_active_sessions(p_site text default null)
returns table (
  id uuid, code text, deck_id text, deck_title text, mode public.session_mode,
  created_at timestamptz, status public.session_status, site text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.code, s.deck_id, s.deck_title, s.mode, s.created_at, s.status, s.site
  from public.sessions s
  where s.status in ('active', 'paused') and auth.uid() is not null
    and (s.site is null or s.site = nullif(lower(btrim(coalesce(p_site, ''))), ''))
  order by s.created_at desc
$$;

drop function public.list_my_sessions();
create function public.list_my_sessions(p_site text default null)
returns table (
  id uuid, code text, deck_id text, deck_title text, mode public.session_mode,
  created_at timestamptz, status public.session_status, site text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.code, s.deck_id, s.deck_title, s.mode, s.created_at, s.status, s.site
  from public.sessions s
  join public.session_participants sp on sp.session_id = s.id and sp.user_id = auth.uid()
  where s.status in ('active', 'paused')
    and (s.site is null or s.site = nullif(lower(btrim(coalesce(p_site, ''))), ''))
  order by s.created_at desc
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'create_site_session(text,text,public.session_mode,int,jsonb,text)',
    'join_site_session(text,text)',
    'list_active_sessions(text)',
    'list_my_sessions(text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
