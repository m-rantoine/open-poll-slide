-- Pausing keeps everything where it was: position, answers and running timers (their remaining
-- time is stored and restored on resume). Participants stay in the session but cannot answer.
alter table public.sessions add column paused_at timestamptz;
alter table public.session_question_state add column paused_remaining_ms int;

create function public.pause_session(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  update public.sessions set status = 'paused', paused_at = now()
    where id = p_session and status = 'active';
  if not found then return; end if;
  update public.session_question_state
    set paused_remaining_ms = greatest(0, extract(epoch from ends_at - now()) * 1000)::int,
        ends_at = null
    where session_id = p_session and state = 'open' and ends_at is not null;
  update public.session_participants sp
    set inactive_total_seconds = sp.inactive_total_seconds + public.presence_gap(sp),
        status = 'inactive',
        inactive_since = null
    where sp.session_id = p_session;
end $$;

create function public.resume_session(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  update public.sessions set status = 'active', paused_at = null
    where id = p_session and status = 'paused';
  if not found then return; end if;
  update public.session_question_state
    set ends_at = now() + make_interval(secs => paused_remaining_ms / 1000.0),
        paused_remaining_ms = null
    where session_id = p_session and paused_remaining_ms is not null;
  update public.session_participants set inactive_since = now()
    where session_id = p_session and status = 'inactive' and inactive_since is null;
end $$;

create or replace function public.end_session(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  update public.sessions set status = 'ended', ended_at = now()
    where id = p_session and status in ('active', 'paused');
  if not found then return; end if;
  update public.session_participants sp
    set inactive_total_seconds = sp.inactive_total_seconds + public.presence_gap(sp),
        status = 'inactive',
        inactive_since = null
    where sp.session_id = p_session;
end $$;

create or replace function public.join_session(p_code text) returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  prof public.profiles;
  joined_status text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into s from public.sessions where code = upper(trim(p_code));
  if not found or s.status = 'ended' then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  select * into prof from public.profiles where id = auth.uid();
  -- Someone joining a paused session waits there; their clock starts when the host resumes.
  joined_status := case when s.status = 'paused' then 'inactive' else 'active' end;

  insert into public.session_participants as sp (session_id, user_id, display_name, email, status)
  values (s.id, auth.uid(), prof.display_name, prof.email, joined_status)
  on conflict (session_id, user_id) do update
    set inactive_total_seconds = sp.inactive_total_seconds + public.presence_gap(sp),
        last_seen = now(),
        status = joined_status,
        inactive_since = null;
  if joined_status = 'active' then
    insert into public.presence_events (session_id, user_id, status) values (s.id, auth.uid(), 'active');
  end if;
  return s;
end $$;

create or replace function public.submit_answer(p_session uuid, p_question text, p_option text)
returns public.answers
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  st public.session_question_state;
  key public.answer_keys;
  result public.answers;
  answered int;
  expected int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into s from public.sessions where id = p_session;
  if found and s.status = 'paused' then
    raise exception 'session_paused' using errcode = 'P0001';
  end if;
  if not found or s.status <> 'active' then
    raise exception 'session_not_active' using errcode = 'P0001';
  end if;
  if not public.is_participant(p_session) then
    raise exception 'not_a_participant' using errcode = '42501';
  end if;

  select * into st from public.session_question_state
    where session_id = p_session and question_id = p_question for update;
  if not found then
    raise exception 'unknown_question' using errcode = 'P0002';
  end if;
  if st.state <> 'open' or (st.ends_at is not null and st.ends_at <= now()) then
    raise exception 'question_closed' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(s.questions -> p_question -> 'options') o where o ->> 'id' = p_option
  ) then
    raise exception 'unknown_option' using errcode = '22023';
  end if;

  select * into key from public.answer_keys where session_id = p_session and question_id = p_question;

  begin
    insert into public.answers (session_id, question_id, user_id, option_id, is_correct)
    values (
      p_session, p_question, auth.uid(), p_option,
      case when key.correct_option_ids is null or cardinality(key.correct_option_ids) = 0 then null
           else p_option = any (key.correct_option_ids) end
    )
    returning * into result;
  exception when unique_violation then
    raise exception 'already_answered' using errcode = '23505';
  end;

  if s.mode = 'host' then
    select count(*) into answered from public.answers where session_id = p_session and question_id = p_question;
    -- Students whose heartbeat has stopped have left; don't keep the question open for them.
    select count(*) into expected from public.session_participants sp
      where sp.session_id = p_session
        and (sp.last_seen > now() - interval '60 seconds'
          or exists (
            select 1 from public.answers a
            where a.session_id = p_session and a.question_id = p_question and a.user_id = sp.user_id
          ));
    if answered >= expected then
      update public.session_question_state set state = 'ended', ends_at = null
        where session_id = p_session and question_id = p_question;
    end if;
  end if;
  return result;
end $$;

drop function public.list_active_sessions();
create function public.list_active_sessions()
returns table (
  id uuid, code text, deck_id text, deck_title text, mode public.session_mode,
  created_at timestamptz, status public.session_status
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.code, s.deck_id, s.deck_title, s.mode, s.created_at, s.status
  from public.sessions s
  where s.status in ('active', 'paused') and auth.uid() is not null
  order by s.created_at desc
$$;

create function public.list_my_sessions()
returns table (
  id uuid, code text, deck_id text, deck_title text, mode public.session_mode,
  created_at timestamptz, status public.session_status
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.code, s.deck_id, s.deck_title, s.mode, s.created_at, s.status
  from public.sessions s
  join public.session_participants sp on sp.session_id = s.id and sp.user_id = auth.uid()
  where s.status in ('active', 'paused')
  order by s.created_at desc
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pause_session(uuid)', 'resume_session(uuid)', 'list_active_sessions()', 'list_my_sessions()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
