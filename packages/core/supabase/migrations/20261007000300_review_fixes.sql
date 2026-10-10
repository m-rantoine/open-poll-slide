create table public.deck_answer_keys (
  deck_id text not null,
  question_id text not null,
  correct_option_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (deck_id, question_id)
);

alter table public.deck_answer_keys enable row level security;

create policy deck_answer_keys_host_read on public.deck_answer_keys for select to authenticated
  using (public.is_host());

insert into public.deck_answer_keys (deck_id, question_id, correct_option_ids)
select distinct on (s.deck_id, k.question_id) s.deck_id, k.question_id, k.correct_option_ids
from public.answer_keys k
join public.sessions s on s.id = k.session_id
where cardinality(k.correct_option_ids) > 0
order by s.deck_id, k.question_id, s.created_at desc
on conflict do nothing;

-- Participants can read their session row, so it must never carry the answer key.
update public.sessions
set questions = (
  select coalesce(jsonb_object_agg(key, value - 'correct'), '{}'::jsonb)
  from jsonb_each(questions)
)
where jsonb_typeof(questions) = 'object';

update public.session_participants sp
set inactive_total_seconds = sp.inactive_total_seconds
      + greatest(0, extract(epoch from s.ended_at - sp.inactive_since))::int,
    inactive_since = null
from public.sessions s
where s.id = sp.session_id and s.status = 'ended' and sp.inactive_since is not null;

create or replace function public.create_session(
  p_deck_id text,
  p_deck_title text,
  p_mode public.session_mode,
  p_page_count int,
  p_questions jsonb
) returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  q record;
  correct text[];
  questions jsonb := coalesce(p_questions, '{}'::jsonb);
begin
  perform public.require_host();
  insert into public.sessions (code, deck_id, deck_title, mode, host_id, page_count, questions)
  values (
    public.gen_session_code(), p_deck_id, p_deck_title, p_mode, auth.uid(),
    coalesce(p_page_count, 0),
    (select coalesce(jsonb_object_agg(key, value - 'correct'), '{}'::jsonb) from jsonb_each(questions))
  )
  returning * into s;

  for q in select key, value from jsonb_each(questions) loop
    select dk.correct_option_ids into correct
    from public.deck_answer_keys dk
    where dk.deck_id = p_deck_id and dk.question_id = q.key;
    if not found then
      select coalesce(array_agg(v), '{}') into correct
      from jsonb_array_elements_text(coalesce(q.value -> 'correct', '[]'::jsonb)) as v;
    end if;

    insert into public.session_question_state (session_id, question_id, state, show_results)
    values (
      s.id, q.key,
      case when p_mode = 'host' and coalesce((q.value ->> 'startLocked')::boolean, true) then 'locked' else 'open' end,
      coalesce((q.value ->> 'showResults')::boolean, false)
    );
    insert into public.answer_keys (session_id, question_id, correct_option_ids)
    values (s.id, q.key, correct);
  end loop;
  return s;
end $$;

create or replace function public.toggle_correct_option(p_session uuid, p_question text, p_option text)
returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  deck text;
  result text[];
begin
  perform public.require_host();
  select s.deck_id into deck
  from public.sessions s,
    jsonb_array_elements(s.questions -> p_question -> 'options') o
  where s.id = p_session and o ->> 'id' = p_option;
  if not found then
    raise exception 'unknown_option' using errcode = '22023';
  end if;

  insert into public.answer_keys (session_id, question_id, correct_option_ids)
  values (p_session, p_question, array[p_option])
  on conflict (session_id, question_id) do update
    set correct_option_ids = case
      when p_option = any (public.answer_keys.correct_option_ids)
        then array_remove(public.answer_keys.correct_option_ids, p_option)
      else array_append(public.answer_keys.correct_option_ids, p_option)
    end
  returning correct_option_ids into result;

  insert into public.deck_answer_keys (deck_id, question_id, correct_option_ids)
  values (deck, p_question, result)
  on conflict (deck_id, question_id) do update
    set correct_option_ids = excluded.correct_option_ids, updated_at = now();
  return result;
end $$;

-- Seconds since a participant's last heartbeat once it is old enough to count as gone.
create function public.presence_gap(p public.session_participants) returns int
language sql stable set search_path = '' as $$
  select case
    when p.status = 'inactive' and p.inactive_since is not null
      then greatest(0, extract(epoch from now() - p.inactive_since))::int
    when p.status = 'active' and p.last_seen < now() - interval '60 seconds'
      then greatest(0, extract(epoch from now() - p.last_seen))::int
    else 0
  end
$$;

create or replace function public.end_session(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  update public.sessions set status = 'ended', ended_at = now() where id = p_session and status = 'active';
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
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into s from public.sessions where code = upper(trim(p_code));
  if not found or s.status <> 'active' then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  select * into prof from public.profiles where id = auth.uid();

  insert into public.session_participants as sp (session_id, user_id, display_name, email)
  values (s.id, auth.uid(), prof.display_name, prof.email)
  on conflict (session_id, user_id) do update
    set inactive_total_seconds = sp.inactive_total_seconds + public.presence_gap(sp),
        last_seen = now(),
        status = 'active',
        inactive_since = null;
  insert into public.presence_events (session_id, user_id, status) values (s.id, auth.uid(), 'active');
  return s;
end $$;

create or replace function public.set_presence(p_session uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.session_participants;
begin
  if not exists (select 1 from public.sessions where id = p_session and status = 'active') then
    return;
  end if;
  select * into cur from public.session_participants
    where session_id = p_session and user_id = auth.uid() for update;
  if not found then return; end if;
  if p_active then
    update public.session_participants
      set inactive_total_seconds = inactive_total_seconds + public.presence_gap(cur),
          status = 'active', last_seen = now(), inactive_since = null
      where session_id = p_session and user_id = auth.uid();
    if cur.status = 'inactive' then
      insert into public.presence_events (session_id, user_id, status) values (p_session, auth.uid(), 'active');
    end if;
  elsif cur.status = 'active' then
    update public.session_participants
      set inactive_total_seconds = inactive_total_seconds + public.presence_gap(cur),
          status = 'inactive', inactive_since = now(), last_seen = now()
      where session_id = p_session and user_id = auth.uid();
    insert into public.presence_events (session_id, user_id, status) values (p_session, auth.uid(), 'inactive');
  else
    update public.session_participants set last_seen = now()
      where session_id = p_session and user_id = auth.uid();
  end if;
end $$;

create or replace function public.host_question_action(
  p_session uuid,
  p_question text,
  p_action text,
  p_seconds int default 0
) returns public.session_question_state
language plpgsql security definer set search_path = '' as $$
declare
  st public.session_question_state;
begin
  perform public.require_host();
  select * into st from public.session_question_state
    where session_id = p_session and question_id = p_question for update;
  if not found then
    raise exception 'unknown_question' using errcode = 'P0002';
  end if;

  if p_action = 'unlock' then
    update public.session_question_state set state = 'open', ends_at = null
      where session_id = p_session and question_id = p_question;
  elsif p_action = 'lock' then
    update public.session_question_state set state = 'locked', ends_at = null
      where session_id = p_session and question_id = p_question;
  elsif p_action = 'add_time' then
    update public.session_question_state
      set state = 'open',
          ends_at = case when ends_at is not null and ends_at > now() then ends_at else now() end
            + make_interval(secs => greatest(p_seconds, 0))
      where session_id = p_session and question_id = p_question;
  elsif p_action = 'end' then
    update public.session_question_state set state = 'ended', ends_at = null
      where session_id = p_session and question_id = p_question;
  elsif p_action = 'expire' then
    update public.session_question_state set state = 'ended', ends_at = null
      where session_id = p_session and question_id = p_question
        and state = 'open' and ends_at is not null and ends_at <= now();
  else
    raise exception 'bad_action' using errcode = '22023';
  end if;

  select * into st from public.session_question_state
    where session_id = p_session and question_id = p_question;
  return st;
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

create function public.session_summaries(p_limit int default 100)
returns table (session_id uuid, students int, class_average numeric)
language sql stable security definer set search_path = '' as $$
  with recent as (
    select s.id, s.created_at from public.sessions s
    where public.is_host()
    order by s.created_at desc
    limit p_limit
  ),
  per_user as (
    select a.session_id, avg(case when a.is_correct then 1.0 else 0.0 end) as score
    from public.answers a
    join recent r on r.id = a.session_id
    where a.is_correct is not null
    group by a.session_id, a.user_id
  )
  select r.id,
    (select count(*) from public.session_participants sp where sp.session_id = r.id)::int,
    (select avg(pu.score) from per_user pu where pu.session_id = r.id)
  from recent r
  order by r.created_at desc
$$;

revoke all on function public.presence_gap(public.session_participants) from public, anon, authenticated;
revoke all on function public.session_summaries(int) from public, anon;
grant execute on function public.session_summaries(int) to authenticated;
