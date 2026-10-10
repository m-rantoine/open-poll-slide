-- Association questions: sorting with one tile per zone.
--
-- They reuse the sorting tables and RPCs. The only difference is capacity: a zone holds one tile,
-- so placing a tile in an occupied zone sends the previous tile back to the pool. Swapping two
-- tiles is done by the client as two moves.

create or replace function public.grade_answer(
  p_type text, p_scored boolean, p_option text, p_correct text[], p_incorrect text[]
) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when not p_scored then null
    when p_type in ('drag_drop', 'association') then null
    when p_type = 'word_cloud' then
      case when p_option = any (coalesce(p_correct, '{}')) then true
           when p_option = any (coalesce(p_incorrect, '{}')) then false
           else null end
    when cardinality(coalesce(p_correct, '{}')) = 0 then null
    else p_option = any (p_correct)
  end
$$;

create or replace function public.regrade_question(p_session uuid, p_question text) returns void
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
  if qtype in ('drag_drop', 'association') then
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
      coalesce((q.value ->> 'scored')::boolean, qtype in ('multiple_choice', 'drag_drop', 'association'))
    );
    insert into public.answer_keys (session_id, question_id, correct_option_ids)
    values (s.id, q.key, correct);
  end loop;
  return s;
end $$;

create or replace function public.place_tile(p_session uuid, p_question text, p_item text, p_zone text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  st public.session_question_state;
  s public.sessions;
  key public.answer_keys;
  qtype text;
begin
  st := public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  qtype := s.questions -> p_question ->> 'type';
  if qtype is null or qtype not in ('drag_drop', 'association') then
    raise exception 'wrong_question_type' using errcode = '22023';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(s.questions -> p_question -> 'items') i where i ->> 'id' = p_item
  ) then
    raise exception 'unknown_option' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.answers
    where session_id = p_session and question_id = p_question and user_id = auth.uid()
  ) then
    raise exception 'already_answered' using errcode = '23505';
  end if;

  if p_zone is null then
    delete from public.placements
      where session_id = p_session and question_id = p_question
        and user_id = auth.uid() and item_id = p_item;
    return;
  end if;
  if not exists (
    select 1 from jsonb_array_elements(s.questions -> p_question -> 'zones') z where z ->> 'id' = p_zone
  ) then
    raise exception 'unknown_option' using errcode = '22023';
  end if;

  if qtype = 'association' then
    delete from public.placements
      where session_id = p_session and question_id = p_question
        and user_id = auth.uid() and zone_id = p_zone and item_id <> p_item;
  end if;

  select * into key from public.answer_keys where session_id = p_session and question_id = p_question;
  insert into public.placements (session_id, question_id, user_id, item_id, zone_id, is_correct)
  values (
    p_session, p_question, auth.uid(), p_item, p_zone,
    public.grade_placement(st.scored, p_item, p_zone, key.correct_option_ids)
  )
  on conflict (session_id, question_id, user_id, item_id) do update
    set zone_id = excluded.zone_id, is_correct = excluded.is_correct, placed_at = now();
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
  if coalesce(s.questions -> p_question ->> 'type', '') not in ('drag_drop', 'association') then
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
   and s.questions -> u.question_id ->> 'type' in ('drag_drop', 'association')
$$;
