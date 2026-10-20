-- Grades a practice answer against the deck's key without storing anything. Placement questions
-- (sorting, association, ranking) send `values` as item -> zone (or position) and get a result per item.
create function public.check_answer(p_deck text, p_question text, p_type text, p_value jsonb)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  keys text[];
  items jsonb := '{}'::jsonb;
  hits int := 0;
  hit boolean;
  e record;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select correct_option_ids into keys
  from public.deck_answer_keys
  where deck_id = p_deck and question_id = p_question;
  if keys is null or cardinality(keys) = 0 then
    raise exception 'no_answer_key';
  end if;

  if p_type = 'multiple_choice' then
    return jsonb_build_object('correct', (p_value ->> 'option') = any (keys));
  elsif p_type = 'word_cloud' then
    return jsonb_build_object('correct', exists (
      select 1 from unnest(keys) k
      where public.normalize_answer(k) = public.normalize_answer(p_value ->> 'text')
    ));
  elsif p_type = 'number' then
    return jsonb_build_object('correct', coalesce(public.grade_number(
      p_value ->> 'text', keys, (p_value ->> 'tolerance')::numeric
    ), false));
  elsif p_type in ('drag_drop', 'association', 'ranking') then
    if jsonb_typeof(p_value -> 'values') is distinct from 'object' then
      raise exception 'invalid_answer' using errcode = '22023';
    end if;
    for e in select je.key as item, je.value as val from jsonb_each_text(p_value -> 'values') je loop
      hit := (e.item || '>' || e.val) = any (keys);
      items := items || jsonb_build_object(e.item, hit);
      if hit then hits := hits + 1; end if;
    end loop;
    return jsonb_build_object('correct', hits, 'total', cardinality(keys), 'items', items);
  end if;
  raise exception 'wrong_question_type' using errcode = '22023';
end $$;

revoke all on function public.check_answer(text, text, text, jsonb) from public, anon;
grant execute on function public.check_answer(text, text, text, jsonb) to authenticated;
