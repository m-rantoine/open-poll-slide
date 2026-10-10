-- Participants cannot read answer_keys or answers, so they never learn that the host marked a
-- correct answer until their next background refresh. They do subscribe to the question's state
-- row, so changing the key bumps a counter there and the change reaches them over the socket.
alter table public.session_question_state
  add column key_version int not null default 0;

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

  update public.session_question_state set key_version = key_version + 1
    where session_id = p_session and question_id = p_question;
  return result;
end $$;
