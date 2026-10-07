-- Run with: supabase db query --linked -f supabase/tests/live_sessions.sql
-- Needs three confirmed users: e2e-host@example.test (listed in hosts), e2e-s1/e2e-s2@mon-avenir.ca.
-- Always aborts at the end so nothing is persisted; the report is in the error message.
do $$
declare
  host_id uuid; s1 uuid; s2 uuid;
  sess public.sessions; r text := ''; n int; ok boolean; v text; b boolean;
  qs jsonb := '{
    "capital": {"id":"capital","question":"Capital?","options":[{"id":"toronto","label":"T"},{"id":"ottawa","label":"O"}],"correct":["ottawa"],"startLocked":true,"showResults":false},
    "fav": {"id":"fav","question":"Fav?","options":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"startLocked":false,"showResults":true}
  }'::jsonb;
  st public.session_question_state;

  procedure_dummy int;
begin
  select id into host_id from auth.users where email = 'e2e-host@example.test';
  select id into s1 from auth.users where email = 'e2e-s1@mon-avenir.ca';
  select id into s2 from auth.users where email = 'e2e-s2@mon-avenir.ca';

  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'e2e-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into sess from public.create_session('deck', 'Deck', 'host', 2, qs);
  r := r || format('create_session code=%s locked=%s%s', sess.code,
    (select state from public.session_question_state where session_id = sess.id and question_id = 'capital'),
    E'\n');
  r := r || format('fav initial state (startLocked=false) = %s%s',
    (select state from public.session_question_state where session_id = sess.id and question_id = 'fav'), E'\n');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'e2e-s1@mon-avenir.ca', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_session('x','x','host',1,'{}'); r := r || 'FAIL student created session' || E'\n';
  exception when others then r := r || 'ok student cannot create_session: ' || sqlerrm || E'\n'; end;
  perform public.join_session(sess.code);
  begin perform public.submit_answer(sess.id, 'capital', 'toronto'); r := r || 'FAIL answered locked' || E'\n';
  exception when others then r := r || 'ok locked rejects answer: ' || sqlerrm || E'\n'; end;
  begin perform public.host_question_action(sess.id, 'capital', 'unlock'); r := r || 'FAIL student unlocked' || E'\n';
  exception when others then r := r || 'ok student cannot unlock: ' || sqlerrm || E'\n'; end;
  begin perform public.toggle_correct_option(sess.id, 'capital', 'toronto'); r := r || 'FAIL student toggled key' || E'\n';
  exception when others then r := r || 'ok student cannot toggle key: ' || sqlerrm || E'\n'; end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'email', 'e2e-s2@mon-avenir.ca', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.join_session(lower(sess.code));
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'e2e-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.host_question_action(sess.id, 'capital', 'add_time', 30);
  select * into st from public.session_question_state where session_id = sess.id and question_id = 'capital';
  r := r || format('add_time => state=%s ends_in~%ss%s', st.state, round(extract(epoch from st.ends_at - now())), E'\n');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'e2e-s1@mon-avenir.ca', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.submit_answer(sess.id, 'capital', 'toronto');
  begin perform public.submit_answer(sess.id, 'capital', 'ottawa'); r := r || 'FAIL answered twice' || E'\n';
  exception when others then r := r || 'ok second answer rejected: ' || sqlerrm || E'\n'; end;
  begin perform public.submit_answer(sess.id, 'capital', 'bogus'); r := r || 'FAIL bogus option' || E'\n';
  exception when others then r := r || 'ok bogus option rejected (' || sqlerrm || ')' || E'\n'; end;
  select count(*) into n from public.answers; r := r || format('student sees answers rows=%s (want 0)%s', n, E'\n');
  select count(*) into n from public.answer_keys; r := r || format('student sees answer_keys rows=%s (want 0)%s', n, E'\n');
  select count(*) into n from public.session_participants; r := r || format('student sees participants rows=%s (want 1)%s', n, E'\n');
  select is_correct into b from public.my_answers(sess.id) where question_id = 'capital';
  r := r || format('is_correct before show_results = %s (want null)%s', coalesce(b::text, 'null'), E'\n');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'email', 'e2e-s2@mon-avenir.ca', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.submit_answer(sess.id, 'capital', 'ottawa');
  execute 'reset role';
  select * into st from public.session_question_state where session_id = sess.id and question_id = 'capital';
  r := r || format('after all answered state=%s (want ended)%s', st.state, E'\n');

  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'e2e-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_show_results(sess.id, 'capital', true);
  select count(*) into n from public.answers where session_id = sess.id; r := r || format('host sees answers=%s (want 2)%s', n, E'\n');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'e2e-s1@mon-avenir.ca', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select is_correct into b from public.my_answers(sess.id) where question_id = 'capital';
  r := r || format('s1 is_correct after show_results = %s (want false)%s', coalesce(b::text,'null'), E'\n');
  select format('%s/%s avg=%s', correct, graded, round(class_average, 2)) into v from public.my_score(sess.id);
  r := r || format('s1 score %s (want 0/1 avg=0.50)%s', v, E'\n');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'e2e-s1@mon-avenir.ca', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.submit_answer(sess.id, 'fav', 'a');
  execute 'reset role';
  select is_correct into b from public.answers where session_id = sess.id and question_id = 'fav' and user_id = s1;
  r := r || format('fav is_correct with no key = %s (want null)%s', coalesce(b::text,'null'), E'\n');
  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'e2e-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.toggle_correct_option(sess.id, 'fav', 'a');
  execute 'reset role';
  select is_correct into b from public.answers where session_id = sess.id and question_id = 'fav' and user_id = s1;
  r := r || format('fav is_correct after host marks a correct = %s (want true)%s', coalesce(b::text,'null'), E'\n');
  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'e2e-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.toggle_correct_option(sess.id, 'fav', 'a');
  perform public.toggle_correct_option(sess.id, 'fav', 'b');
  execute 'reset role';
  select is_correct into b from public.answers where session_id = sess.id and question_id = 'fav' and user_id = s1;
  r := r || format('fav is_correct after key changed to b = %s (want false)%s', coalesce(b::text,'null'), E'\n');

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'e2e-s1@mon-avenir.ca', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_presence(sess.id, false);
  select status into v from public.session_participants where user_id = s1; r := r || format('presence after blur = %s%s', v, E'\n');
  perform public.join_session(sess.code);
  select status into v from public.session_participants where user_id = s1; r := r || format('presence after rejoin = %s%s', v, E'\n');
  execute 'reset role';

  r := r || format('hook mon-avenir.ca: %s%s', public.hook_restrict_signup_domain('{"user":{"email":"kid@mon-avenir.ca"}}'), E'\n');
  r := r || format('hook host email: %s%s', public.hook_restrict_signup_domain('{"user":{"email":"e2e-host@example.test"}}'), E'\n');
  r := r || format('hook other domain: %s%s', public.hook_restrict_signup_domain('{"user":{"email":"x@gmail.com"}}'), E'\n');

  raise exception E'\nREPORT\n%', r;
end $$;
