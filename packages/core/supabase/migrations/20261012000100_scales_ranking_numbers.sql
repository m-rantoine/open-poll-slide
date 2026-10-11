-- Scale, ranking and points questions (stored as placements) and number and open-text questions
-- (stored as text answers).
--
-- A placement is "item -> value". Scale: statement -> rating. Ranking: item -> position (1 is
-- first). Points: option -> points. `set_placements` replaces a participant's whole set so a
-- ranking is always a complete order. Only a ranking with a key is graded; its key is stored as
-- 'item>position' pairs, so grade_placement works unchanged.

create or replace function public.grade_answer(
  p_type text, p_scored boolean, p_option text, p_correct text[], p_incorrect text[]
) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when not p_scored then null
    when p_type in ('drag_drop', 'association', 'ranking', 'scale', 'points', 'open_text') then null
    when p_type = 'word_cloud' then
      case when p_option = any (coalesce(p_correct, '{}')) then true
           when p_option = any (coalesce(p_incorrect, '{}')) then false
           else null end
    when cardinality(coalesce(p_correct, '{}')) = 0 then null
    else p_option = any (p_correct)
  end
$$;

create function public.parse_number(p_text text) returns numeric
language sql immutable set search_path = '' as $$
  select case when replace(btrim(p_text), ',', '.') ~ '^-?[0-9]+(\.[0-9]+)?$'
              then replace(btrim(p_text), ',', '.')::numeric end
$$;

create function public.grade_number(p_option text, p_correct text[], p_tolerance numeric)
returns boolean
language sql immutable set search_path = '' as $$
  select case
    when cardinality(coalesce(p_correct, '{}')) = 0 then null
    else exists (
      select 1 from unnest(p_correct) c
      where public.parse_number(c) is not null
        and abs(public.parse_number(p_option) - public.parse_number(c)) <= coalesce(p_tolerance, 0)
    )
  end
$$;

create or replace function public.regrade_question(p_session uuid, p_question text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  st public.session_question_state;
  key public.answer_keys;
  qtype text;
  tol numeric;
begin
  select * into st from public.session_question_state
    where session_id = p_session and question_id = p_question;
  if not found then return; end if;
  select * into key from public.answer_keys
    where session_id = p_session and question_id = p_question;
  select coalesce(s.questions -> p_question ->> 'type', 'multiple_choice'),
         coalesce((s.questions -> p_question ->> 'tolerance')::numeric, 0)
    into qtype, tol
    from public.sessions s where s.id = p_session;
  if qtype = 'number' then
    update public.answers a
      set is_correct = case when not st.scored then null
                            else public.grade_number(a.option_id, key.correct_option_ids, tol) end
      where a.session_id = p_session and a.question_id = p_question;
  else
    update public.answers a
      set is_correct = public.grade_answer(
        qtype, st.scored, a.option_id, key.correct_option_ids, key.incorrect_option_ids)
      where a.session_id = p_session and a.question_id = p_question;
  end if;
  if qtype in ('drag_drop', 'association', 'ranking') then
    update public.placements p
      set is_correct = public.grade_placement(st.scored, p.item_id, p.zone_id, key.correct_option_ids)
      where p.session_id = p_session and p.question_id = p_question;
  end if;
end $$;

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
      if jsonb_typeof(q.value -> 'correct') = 'object' then
        select coalesce(array_agg(e.key || '>' || e.value), '{}') into correct
        from jsonb_each_text(q.value -> 'correct') e;
      elsif qtype = 'ranking' and jsonb_typeof(q.value -> 'correct') = 'array' then
        -- The correct order, first to last, becomes item>position pairs.
        select coalesce(array_agg(v || '>' || n), '{}') into correct
        from jsonb_array_elements_text(q.value -> 'correct') with ordinality as t(v, n);
      elsif jsonb_typeof(q.value -> 'correct') = 'number' then
        correct := array[q.value ->> 'correct'];
      else
        select coalesce(array_agg(v), '{}') into correct
        from jsonb_array_elements_text(
          case when jsonb_typeof(q.value -> 'correct') = 'array' then q.value -> 'correct' else '[]'::jsonb end
        ) as v;
      end if;
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
      coalesce((q.value ->> 'scored')::boolean, qtype in ('multiple_choice', 'drag_drop', 'association', 'ranking', 'number'))
    );
    insert into public.answer_keys (session_id, question_id, correct_option_ids)
    values (s.id, q.key, correct);
  end loop;
  return s;
end $$;

create or replace function public.submit_text_answer(p_session uuid, p_question text, p_text text)
returns public.answers
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  st public.session_question_state;
  key public.answer_keys;
  result public.answers;
  qtype text;
  clean text;
  max_len int;
  norm text;
  graded boolean;
  num numeric;
begin
  st := public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  qtype := s.questions -> p_question ->> 'type';
  if qtype is null or qtype not in ('word_cloud', 'number', 'open_text') then
    raise exception 'wrong_question_type' using errcode = '22023';
  end if;
  clean := btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
  if qtype = 'open_text' then
    clean := btrim(coalesce(p_text, ''));
  end if;
  max_len := least(
    case qtype when 'open_text' then 1000 when 'number' then 24 else 60 end,
    greatest(1, coalesce((s.questions -> p_question ->> 'maxLength')::int,
      case qtype when 'open_text' then 500 when 'number' then 24 else 60 end))
  );
  if char_length(clean) < 1 or char_length(clean) > max_len then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;

  select * into key from public.answer_keys where session_id = p_session and question_id = p_question;

  if qtype = 'number' then
    num := public.parse_number(clean);
    if num is null
       or num < coalesce((s.questions -> p_question ->> 'min')::numeric, num)
       or num > coalesce((s.questions -> p_question ->> 'max')::numeric, num) then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
    norm := trim_scale(num)::text;
    graded := case when not st.scored then null
                   else public.grade_number(norm, key.correct_option_ids,
                          coalesce((s.questions -> p_question ->> 'tolerance')::numeric, 0)) end;
  elsif qtype = 'open_text' then
    norm := left(public.normalize_answer(clean), 200);
    graded := null;
  else
    norm := public.normalize_answer(clean);
    graded := public.grade_answer('word_cloud', st.scored, norm, key.correct_option_ids, key.incorrect_option_ids);
  end if;

  begin
    insert into public.answers (session_id, question_id, user_id, option_id, answer_text, is_correct)
    values (p_session, p_question, auth.uid(), norm, clean, graded)
    returning * into result;
  exception when unique_violation then
    raise exception 'already_answered' using errcode = '23505';
  end;

  perform public.auto_end_question(p_session, p_question);
  return result;
end $$;

create function public.set_placements(p_session uuid, p_question text, p_values jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  st public.session_question_state;
  s public.sessions;
  akey public.answer_keys;
  qtype text;
  n_items int;
  lo int;
  hi int;
  total int;
  e record;
  ranks int[] := '{}';
  sum_points int := 0;
  v int;
begin
  st := public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  qtype := s.questions -> p_question ->> 'type';
  if qtype is null or qtype not in ('scale', 'ranking', 'points') then
    raise exception 'wrong_question_type' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.answers
    where session_id = p_session and question_id = p_question and user_id = auth.uid()
  ) then
    raise exception 'already_answered' using errcode = '23505';
  end if;
  if jsonb_typeof(p_values) is distinct from 'object' then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;
  n_items := jsonb_array_length(s.questions -> p_question -> 'items');
  lo := coalesce((s.questions -> p_question ->> 'min')::int, 1);
  hi := coalesce((s.questions -> p_question ->> 'max')::int, 5);
  total := coalesce((s.questions -> p_question ->> 'total')::int, 100);

  for e in select je.key as item, je.value as val from jsonb_each_text(p_values) je loop
    if not exists (
      select 1 from jsonb_array_elements(s.questions -> p_question -> 'items') i where i ->> 'id' = e.item
    ) then
      raise exception 'unknown_option' using errcode = '22023';
    end if;
    if e.val !~ '^[0-9]+$' then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
    v := e.val::int;
    if qtype = 'scale' and (v < lo or v > hi) then
      raise exception 'invalid_answer' using errcode = '22023';
    elsif qtype = 'ranking' then
      if v < 1 or v > n_items or v = any (ranks) then
        raise exception 'invalid_answer' using errcode = '22023';
      end if;
      ranks := ranks || v;
    elsif qtype = 'points' then
      sum_points := sum_points + v;
    end if;
  end loop;
  if qtype = 'points' and sum_points > total then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;
  if qtype = 'ranking' and cardinality(ranks) <> n_items then
    raise exception 'invalid_answer' using errcode = '22023';
  end if;

  select * into akey from public.answer_keys where session_id = p_session and question_id = p_question;
  delete from public.placements
    where session_id = p_session and question_id = p_question and user_id = auth.uid();
  insert into public.placements (session_id, question_id, user_id, item_id, zone_id, is_correct)
  select p_session, p_question, auth.uid(), kv.key, kv.value,
         public.grade_placement(st.scored, kv.key, kv.value, akey.correct_option_ids)
  from jsonb_each_text(p_values) kv;
end $$;

create or replace function public.submit_placements(p_session uuid, p_question text)
returns public.answers
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  result public.answers;
begin
  perform public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  if coalesce(s.questions -> p_question ->> 'type', '')
       not in ('drag_drop', 'association', 'ranking', 'scale', 'points') then
    raise exception 'wrong_question_type' using errcode = '22023';
  end if;
  begin
    insert into public.answers (session_id, question_id, user_id, option_id, is_correct)
    values (p_session, p_question, auth.uid(), 'submitted', null)
    returning * into result;
  exception when unique_violation then
    raise exception 'already_answered' using errcode = '23505';
  end;
  perform public.auto_end_question(p_session, p_question);
  return result;
end $$;

create or replace function public.score_units(p_session uuid)
returns table (user_id uuid, question_id text, graded int, correct int)
language sql stable security definer set search_path = '' as $$
  select a.user_id, a.question_id, 1, (a.is_correct)::int
  from public.answers a
  join public.session_question_state st
    on st.session_id = a.session_id and st.question_id = a.question_id and st.scored
  where a.session_id = p_session and a.is_correct is not null
  union all
  select u.user_id, u.question_id,
         cardinality(ak.correct_option_ids),
         (select count(*) from public.placements p
          where p.session_id = p_session and p.question_id = u.question_id
            and p.user_id = u.user_id and p.is_correct)::int
  from (
    select pl.user_id, pl.question_id from public.placements pl where pl.session_id = p_session
    union
    select an.user_id, an.question_id from public.answers an
    where an.session_id = p_session and an.option_id = 'submitted'
  ) u
  join public.session_question_state st
    on st.session_id = p_session and st.question_id = u.question_id and st.scored
  join public.answer_keys ak
    on ak.session_id = p_session and ak.question_id = u.question_id
   and cardinality(ak.correct_option_ids) > 0
  join public.sessions s on s.id = p_session
   and s.questions -> u.question_id ->> 'type' in ('drag_drop', 'association', 'ranking')
$$;

revoke all on function public.set_placements(uuid, text, jsonb) from public, anon;
grant execute on function public.set_placements(uuid, text, jsonb) to authenticated;
revoke all on function public.parse_number(text) from public, anon, authenticated;
revoke all on function public.grade_number(text, text[], numeric) from public, anon, authenticated;
