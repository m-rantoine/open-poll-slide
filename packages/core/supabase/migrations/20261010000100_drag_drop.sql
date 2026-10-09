-- Drag-and-drop sorting questions.
--
-- Each tile a participant drops in a zone is one row in `placements` and is graded on its own, so a
-- sorting question is worth one point per correct tile. Dropping is saved immediately and can be
-- changed until the participant presses Submit, which inserts the usual `answers` row (option_id
-- 'submitted', never graded); that row is what the "everyone has answered" auto-stop counts.
-- The key is stored in `answer_keys.correct_option_ids` as 'item>zone' pairs.

create table public.placements (
  session_id uuid not null references public.sessions (id) on delete cascade,
  question_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  zone_id text not null,
  is_correct boolean,
  placed_at timestamptz not null default now(),
  primary key (session_id, question_id, user_id, item_id)
);

alter table public.placements enable row level security;
create policy placements_host_read on public.placements for select to authenticated
  using (public.is_host());

alter publication supabase_realtime add table public.placements;

create function public.grade_placement(p_scored boolean, p_item text, p_zone text, p_correct text[])
returns boolean
language sql immutable set search_path = '' as $$
  select case
    when not p_scored then null
    when cardinality(coalesce(p_correct, '{}')) = 0 then null
    else (p_item || '>' || p_zone) = any (p_correct)
  end
$$;

create or replace function public.grade_answer(
  p_type text, p_scored boolean, p_option text, p_correct text[], p_incorrect text[]
) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when not p_scored then null
    when p_type = 'drag_drop' then null
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
  if qtype = 'drag_drop' then
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
      coalesce((q.value ->> 'scored')::boolean, qtype in ('multiple_choice', 'drag_drop'))
    );
    insert into public.answer_keys (session_id, question_id, correct_option_ids)
    values (s.id, q.key, correct);
  end loop;
  return s;
end $$;

create function public.place_tile(p_session uuid, p_question text, p_item text, p_zone text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  st public.session_question_state;
  s public.sessions;
  key public.answer_keys;
begin
  st := public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  if s.questions -> p_question ->> 'type' is distinct from 'drag_drop' then
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

  select * into key from public.answer_keys where session_id = p_session and question_id = p_question;
  insert into public.placements (session_id, question_id, user_id, item_id, zone_id, is_correct)
  values (
    p_session, p_question, auth.uid(), p_item, p_zone,
    public.grade_placement(st.scored, p_item, p_zone, key.correct_option_ids)
  )
  on conflict (session_id, question_id, user_id, item_id) do update
    set zone_id = excluded.zone_id, is_correct = excluded.is_correct, placed_at = now();
end $$;

create function public.submit_placements(p_session uuid, p_question text)
returns public.answers
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  result public.answers;
begin
  perform public.open_question_gate(p_session, p_question);
  select * into s from public.sessions where id = p_session;
  if s.questions -> p_question ->> 'type' is distinct from 'drag_drop' then
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

create function public.my_placements(p_session uuid)
returns table (question_id text, item_id text, zone_id text, is_correct boolean, show_results boolean)
language sql stable security definer set search_path = '' as $$
  select p.question_id, p.item_id, p.zone_id,
         case when st.show_results then p.is_correct end,
         st.show_results
  from public.placements p
  join public.session_question_state st
    on st.session_id = p.session_id and st.question_id = p.question_id
  where p.session_id = p_session and p.user_id = auth.uid()
$$;

-- One row per person and question: how many points it is worth and how many they earned.
-- Single-answer questions are worth one point; a sorting question is worth one point per key tile.
create function public.score_units(p_session uuid)
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
   and s.questions -> u.question_id ->> 'type' = 'drag_drop'
$$;

create or replace function public.my_score(p_session uuid)
returns table (correct int, graded int, class_average numeric)
language sql stable security definer set search_path = '' as $$
  with visible as (
    select su.* from public.score_units(p_session) su
    join public.session_question_state st
      on st.session_id = p_session and st.question_id = su.question_id and st.show_results
  )
  select
    (select coalesce(sum(v.correct) filter (where v.user_id = auth.uid()), 0) from visible v)::int,
    (select coalesce(sum(v.graded) filter (where v.user_id = auth.uid()), 0) from visible v)::int,
    (select avg(per_user) from (
       select sum(v.correct)::numeric / nullif(sum(v.graded), 0) as per_user from visible v group by v.user_id
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
    select r.id as session_id,
           sum(su.correct)::numeric / nullif(sum(su.graded), 0) as score
    from recent r
    cross join lateral public.score_units(r.id) su
    group by r.id, su.user_id
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
    'place_tile(uuid,text,text,text)', 'submit_placements(uuid,text)', 'my_placements(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;

revoke all on function public.grade_placement(boolean, text, text, text[]) from public, anon, authenticated;
revoke all on function public.score_units(uuid) from public, anon, authenticated;
revoke all on function public.session_summaries(int) from public, anon;
grant execute on function public.session_summaries(int) to authenticated;
