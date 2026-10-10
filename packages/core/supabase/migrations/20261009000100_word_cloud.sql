-- Free-text (word cloud) questions and per-question scoring.
--
-- A row counts toward a score only when its question is scored and the answer has a grade
-- (is_correct is not null). Questions without a correct answer, unscored questions and unmarked
-- text answers therefore never count as incorrect; they are left out of the total.

alter table public.session_question_state add column scored boolean not null default true;
alter table public.answer_keys add column incorrect_option_ids text[] not null default '{}';
alter table public.answers add column answer_text text;

create function public.normalize_answer(p_text text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(p_text), '\s+', ' ', 'g'))
$$;

create function public.grade_answer(
  p_type text, p_scored boolean, p_option text, p_correct text[], p_incorrect text[]
) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when not p_scored then null
    when p_type = 'word_cloud' then
      case when p_option = any (coalesce(p_correct, '{}')) then true
           when p_option = any (coalesce(p_incorrect, '{}')) then false
           else null end
    when cardinality(coalesce(p_correct, '{}')) = 0 then null
    else p_option = any (p_correct)
  end
$$;

create function public.regrade_question(p_session uuid, p_question text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  st public.session_question_state;
  key public.answer_keys;
  qtype text;
begin
  select * into st from public.session_question_state
    where session_id = p_session and question_id = p_question;
  if not found then return; end if;
  select * into key from public.answer_keys
    where session_id = p_session and question_id = p_question;
  select coalesce(s.questions -> p_question ->> 'type', 'multiple_choice') into qtype
    from public.sessions s where s.id = p_session;
  update public.answers a
    set is_correct = public.grade_answer(
      qtype, st.scored, a.option_id, key.correct_option_ids, key.incorrect_option_ids)
    where a.session_id = p_session and a.question_id = p_question;
end $$;

create or replace function public.recompute_answer_correctness() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.regrade_question(new.session_id, new.question_id);
  return new;
end $$;

drop trigger answer_keys_recompute on public.answer_keys;
create trigger answer_keys_recompute
after insert or update of correct_option_ids, incorrect_option_ids on public.answer_keys
for each row execute function public.recompute_answer_correctness();

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
  qtype text;
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
    qtype := coalesce(q.value ->> 'type', 'multiple_choice');
    select dk.correct_option_ids into correct
    from public.deck_answer_keys dk
    where dk.deck_id = p_deck_id and dk.question_id = q.key;
    if not found then
      select coalesce(array_agg(v), '{}') into correct
      from jsonb_array_elements_text(coalesce(q.value -> 'correct', '[]'::jsonb)) as v;
    end if;
    if qtype = 'word_cloud' then
      select coalesce(array_agg(public.normalize_answer(v)), '{}') into correct
      from unnest(correct) as v;
    end if;

    insert into public.session_question_state (session_id, question_id, state, show_results, scored)
    values (
      s.id, q.key,
      case when p_mode = 'host' and coalesce((q.value ->> 'startLocked')::boolean, true) then 'locked' else 'open' end,
      coalesce((q.value ->> 'showResults')::boolean, false),
      coalesce((q.value ->> 'scored')::boolean, qtype = 'multiple_choice')
    );
    insert into public.answer_keys (session_id, question_id, correct_option_ids)
    values (s.id, q.key, correct);
  end loop;
  return s;
end $$;

create function public.open_question_gate(p_session uuid, p_question text)
returns public.session_question_state
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  st public.session_question_state;
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
  return st;
end $$;

create function public.auto_end_question(p_session uuid, p_question text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  answered int;
  expected int;
begin
  if not exists (select 1 from public.sessions where id = p_session and mode = 'host') then
    return;
  end if;
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
end $$;

create or replace function public.submit_answer(p_session uuid, p_question text, p_option text)
returns public.answers
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  st public.session_question_state;
  key public.answer_keys;
  result public.answers;
begin
  st := public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  if coalesce(s.questions -> p_question ->> 'type', 'multiple_choice') <> 'multiple_choice' then
    raise exception 'wrong_question_type' using errcode = '22023';
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
      public.grade_answer('multiple_choice', st.scored, p_option, key.correct_option_ids, key.incorrect_option_ids)
    )
    returning * into result;
  exception when unique_violation then
    raise exception 'already_answered' using errcode = '23505';
  end;

  perform public.auto_end_question(p_session, p_question);
  return result;
end $$;

create function public.submit_text_answer(p_session uuid, p_question text, p_text text)
returns public.answers
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  st public.session_question_state;
  key public.answer_keys;
  result public.answers;
  clean text;
  max_len int;
  norm text;
begin
  st := public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  if s.questions -> p_question ->> 'type' is distinct from 'word_cloud' then
    raise exception 'wrong_question_type' using errcode = '22023';
  end if;
  clean := btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
  max_len := least(60, greatest(1, coalesce((s.questions -> p_question ->> 'maxLength')::int, 60)));
  if char_length(clean) < 1 or char_length(clean) > max_len then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;
  norm := public.normalize_answer(clean);

  select * into key from public.answer_keys where session_id = p_session and question_id = p_question;

  begin
    insert into public.answers (session_id, question_id, user_id, option_id, answer_text, is_correct)
    values (
      p_session, p_question, auth.uid(), norm, clean,
      public.grade_answer('word_cloud', st.scored, norm, key.correct_option_ids, key.incorrect_option_ids)
    )
    returning * into result;
  exception when unique_violation then
    raise exception 'already_answered' using errcode = '23505';
  end;

  perform public.auto_end_question(p_session, p_question);
  return result;
end $$;

create function public.mark_answer(p_session uuid, p_question text, p_key text, p_mark text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text := public.normalize_answer(p_key);
begin
  perform public.require_host();
  if p_mark not in ('correct', 'incorrect', 'clear') then
    raise exception 'invalid_mark' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.sessions s
    where s.id = p_session and s.questions -> p_question ->> 'type' = 'word_cloud'
  ) then
    raise exception 'wrong_question_type' using errcode = '22023';
  end if;
  update public.answer_keys ak set
    correct_option_ids = case
      when p_mark = 'correct' then array_append(array_remove(ak.correct_option_ids, k), k)
      else array_remove(ak.correct_option_ids, k) end,
    incorrect_option_ids = case
      when p_mark = 'incorrect' then array_append(array_remove(ak.incorrect_option_ids, k), k)
      else array_remove(ak.incorrect_option_ids, k) end
  where ak.session_id = p_session and ak.question_id = p_question;
  update public.session_question_state set key_version = key_version + 1
    where session_id = p_session and question_id = p_question;
end $$;

create function public.set_question_scored(p_session uuid, p_question text, p_value boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  update public.session_question_state set scored = p_value, key_version = key_version + 1
    where session_id = p_session and question_id = p_question;
  perform public.regrade_question(p_session, p_question);
end $$;

drop function public.my_answers(uuid);
create function public.my_answers(p_session uuid)
returns table (
  question_id text, option_id text, is_correct boolean, show_results boolean, answer_text text
)
language sql stable security definer set search_path = '' as $$
  select a.question_id, a.option_id,
         case when st.show_results then a.is_correct end,
         st.show_results,
         a.answer_text
  from public.answers a
  join public.session_question_state st
    on st.session_id = a.session_id and st.question_id = a.question_id
  where a.session_id = p_session and a.user_id = auth.uid()
$$;

create or replace function public.my_score(p_session uuid)
returns table (correct int, graded int, class_average numeric)
language sql stable security definer set search_path = '' as $$
  with visible as (
    select a.* from public.answers a
    join public.session_question_state st
      on st.session_id = a.session_id and st.question_id = a.question_id
      and st.show_results and st.scored
    where a.session_id = p_session and a.is_correct is not null
  )
  select
    (select count(*) filter (where is_correct and user_id = auth.uid()) from visible)::int,
    (select count(*) filter (where user_id = auth.uid()) from visible)::int,
    (select avg(per_user) from (
       select avg(case when is_correct then 1.0 else 0.0 end) as per_user from visible group by user_id
     ) u)
  where public.is_participant(p_session) or public.is_host()
$$;

create or replace function public.session_summaries(p_limit int default 100)
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
    join public.session_question_state st
      on st.session_id = a.session_id and st.question_id = a.question_id and st.scored
    where a.is_correct is not null
    group by a.session_id, a.user_id
  )
  select r.id,
    (select count(*) from public.session_participants sp where sp.session_id = r.id)::int,
    (select avg(pu.score) from per_user pu where pu.session_id = r.id)
  from recent r
  order by r.created_at desc
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'submit_text_answer(uuid,text,text)', 'mark_answer(uuid,text,text,text)',
    'set_question_scored(uuid,text,boolean)', 'my_answers(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;

revoke all on function public.normalize_answer(text) from public, anon, authenticated;
revoke all on function public.grade_answer(text, boolean, text, text[], text[]) from public, anon, authenticated;
revoke all on function public.regrade_question(uuid, text) from public, anon, authenticated;
revoke all on function public.open_question_gate(uuid, text) from public, anon, authenticated;
revoke all on function public.auto_end_question(uuid, text) from public, anon, authenticated;
revoke all on function public.session_summaries(int) from public, anon;
grant execute on function public.session_summaries(int) to authenticated;
