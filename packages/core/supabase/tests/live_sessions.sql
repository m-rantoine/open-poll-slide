-- Run with: supabase db query --linked -f supabase/tests/live_sessions.sql
-- Creates its own users and always rolls back, so nothing is persisted. Prints PASS lines inside
-- the final error message; any failed check raises immediately with "FAIL <what>".
do $$
declare
  host_id uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  sess public.sessions;
  r text := '';
  n int;
  b boolean;
  v text;
  qs jsonb := '{
    "capital": {"id":"capital","question":"Capital?","options":[{"id":"toronto","label":"T"},{"id":"ottawa","label":"O"}],"correct":["ottawa"],"startLocked":true,"showResults":false},
    "fav": {"id":"fav","question":"Fav?","options":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"startLocked":false,"showResults":true}
  }'::jsonb;
  st public.session_question_state;
  ans public.answers;
  p public.session_participants;
  saved_domains jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values
    (host_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sql-test-host@example.test', '{}', now(), now(), now()),
    (s1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sql-test-s1@school.example.test', '{"display_name":"S1"}', now(), now(), now()),
    (s2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sql-test-s2@school.example.test', '{"display_name":"S2"}', now(), now(), now());
  insert into public.hosts (email) values ('sql-test-host@example.test');

  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into sess from public.create_session('sql-test-deck', 'Deck', 'host', 2, qs);
  select * into st from public.session_question_state where session_id = sess.id and question_id = 'capital';
  if st.state <> 'locked' then raise exception 'FAIL capital should start locked, got %', st.state; end if;
  select * into st from public.session_question_state where session_id = sess.id and question_id = 'fav';
  if st.state <> 'open' then raise exception 'FAIL fav (startLocked=false) should start open, got %', st.state; end if;
  if sess.questions -> 'capital' ? 'correct' then raise exception 'FAIL session row stores the answer key'; end if;
  select count(*) into n from public.answer_keys where session_id = sess.id and question_id = 'capital' and correct_option_ids = array['ottawa'];
  if n <> 1 then raise exception 'FAIL answer key for capital not saved'; end if;
  r := r || 'PASS create_session: initial states, key kept out of sessions.questions' || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'sql-test-s1@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.create_session('x', 'x', 'host', 1, '{}');
    raise exception 'FAIL student created a session';
  exception when insufficient_privilege then null; end;
  perform public.join_session(sess.code);
  select questions::text into v from public.sessions where id = sess.id;
  if v like '%"correct"%' then raise exception 'FAIL student can read the answer key: %', v; end if;
  select count(*) into n from public.deck_answer_keys;
  if n <> 0 then raise exception 'FAIL student can read deck_answer_keys'; end if;
  begin
    perform public.submit_answer(sess.id, 'capital', 'toronto');
    raise exception 'FAIL answered a locked question';
  exception when raise_exception then
    if sqlerrm <> 'question_closed' then raise; end if;
  end;
  begin
    perform public.host_question_action(sess.id, 'capital', 'unlock');
    raise exception 'FAIL student unlocked a question';
  exception when insufficient_privilege then null; end;
  begin
    perform public.toggle_correct_option(sess.id, 'capital', 'toronto');
    raise exception 'FAIL student toggled the key';
  exception when insufficient_privilege then null; end;
  r := r || 'PASS student: cannot create, unlock, re-key, or read the key' || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'email', 'sql-test-s2@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.join_session(lower(sess.code));
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into st from public.host_question_action(sess.id, 'capital', 'add_time', 30);
  if st.state <> 'open' or st.ends_at is null then raise exception 'FAIL add_time did not open with a timer'; end if;
  r := r || 'PASS add_time opens the question with a timer' || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'sql-test-s1@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into ans from public.submit_answer(sess.id, 'capital', 'toronto');
  if ans.is_correct is distinct from false then raise exception 'FAIL submit response should say incorrect, got %', ans.is_correct; end if;
  begin
    perform public.submit_answer(sess.id, 'capital', 'ottawa');
    raise exception 'FAIL answered twice';
  exception when unique_violation then null; end;
  begin
    perform public.submit_answer(sess.id, 'capital', 'bogus');
    raise exception 'FAIL accepted an unknown option';
  exception when invalid_parameter_value then null; when unique_violation then null; end;
  select count(*) into n from public.answers;
  if n <> 0 then raise exception 'FAIL student sees % answer rows', n; end if;
  select count(*) into n from public.answer_keys;
  if n <> 0 then raise exception 'FAIL student sees % answer_keys rows', n; end if;
  select count(*) into n from public.session_participants;
  if n <> 1 then raise exception 'FAIL student sees % participant rows (want 1)', n; end if;
  select is_correct into b from public.my_answers(sess.id) where question_id = 'capital';
  if b is not null then raise exception 'FAIL my_answers reveals correctness before show_results'; end if;
  r := r || 'PASS submit_answer: response grades, one answer only, other rows hidden' || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'email', 'sql-test-s2@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into ans from public.submit_answer(sess.id, 'capital', 'ottawa');
  if ans.is_correct is distinct from true then raise exception 'FAIL submit response should say correct'; end if;
  execute 'reset role';
  select * into st from public.session_question_state where session_id = sess.id and question_id = 'capital';
  if st.state <> 'ended' then raise exception 'FAIL question should end after all answered, got %', st.state; end if;
  r := r || 'PASS question ends once everyone answered' || E'\n';

  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_show_results(sess.id, 'capital', true);
  select count(*) into n from public.answers where session_id = sess.id;
  if n <> 2 then raise exception 'FAIL host sees % answers (want 2)', n; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'sql-test-s1@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select is_correct into b from public.my_answers(sess.id) where question_id = 'capital';
  if b is distinct from false then raise exception 'FAIL s1 is_correct after show_results = %', b; end if;
  select format('%s/%s avg=%s', correct, graded, round(class_average, 2)) into v from public.my_score(sess.id);
  if v <> '0/1 avg=0.50' then raise exception 'FAIL s1 score %', v; end if;
  r := r || 'PASS show_results reveals grading and score' || E'\n';
  execute 'reset role';

  -- s2's heartbeat has stopped, so s1's answer alone should close fav.
  update public.session_participants set last_seen = now() - interval '5 minutes'
    where session_id = sess.id and user_id = s2;
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'sql-test-s1@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.submit_answer(sess.id, 'fav', 'a');
  execute 'reset role';
  select * into st from public.session_question_state where session_id = sess.id and question_id = 'fav';
  if st.state <> 'ended' then raise exception 'FAIL auto-end should ignore students who left, got %', st.state; end if;
  r := r || 'PASS auto-end ignores students who left' || E'\n';

  select is_correct into b from public.answers where session_id = sess.id and question_id = 'fav' and user_id = s1;
  if b is not null then raise exception 'FAIL fav graded without a key'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.toggle_correct_option(sess.id, 'fav', 'a');
  execute 'reset role';
  select is_correct into b from public.answers where session_id = sess.id and question_id = 'fav' and user_id = s1;
  if b is distinct from true then raise exception 'FAIL fav not regraded after marking a'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.toggle_correct_option(sess.id, 'fav', 'a');
  perform public.toggle_correct_option(sess.id, 'fav', 'b');
  execute 'reset role';
  select is_correct into b from public.answers where session_id = sess.id and question_id = 'fav' and user_id = s1;
  if b is distinct from false then raise exception 'FAIL fav not regraded after key changed to b'; end if;
  select count(*) into n from public.deck_answer_keys
    where deck_id = 'sql-test-deck' and question_id = 'fav' and correct_option_ids = array['b'];
  if n <> 1 then raise exception 'FAIL marking a key live did not persist for the deck'; end if;
  select key_version into n from public.session_question_state where session_id = sess.id and question_id = 'fav';
  if n <> 3 then raise exception 'FAIL each key change should bump key_version (got %)', n; end if;
  r := r || 'PASS live re-keying regrades and is remembered for the deck' || E'\n';

  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into st from public.host_question_action(sess.id, 'fav', 'add_time', 1);
  execute 'reset role';
  update public.session_question_state set ends_at = now() - interval '1 second' where session_id = sess.id and question_id = 'fav';
  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into st from public.host_question_action(sess.id, 'fav', 'expire');
  if st.state <> 'ended' then raise exception 'FAIL expired timer should end the question, got %', st.state; end if;
  r := r || 'PASS timer expiry ends the question' || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'sql-test-s1@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_presence(sess.id, false);
  select status into v from public.session_participants where user_id = s1;
  if v <> 'inactive' then raise exception 'FAIL presence after blur = %', v; end if;
  perform public.join_session(sess.code);
  select status into v from public.session_participants where user_id = s1;
  if v <> 'active' then raise exception 'FAIL presence after rejoin = %', v; end if;
  r := r || 'PASS presence: blur and rejoin' || E'\n';
  execute 'reset role';

  update public.session_participants
    set status = 'inactive', inactive_since = now() - interval '30 seconds', inactive_total_seconds = 0
    where session_id = sess.id and user_id = s1;
  perform set_config('request.jwt.claims', json_build_object('sub', host_id, 'email', 'sql-test-host@example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.end_session(sess.id);
  execute 'reset role';
  select * into p from public.session_participants where session_id = sess.id and user_id = s1;
  if p.inactive_since is not null or p.inactive_total_seconds not between 29 and 31 then
    raise exception 'FAIL end_session should close the open inactive interval (total=%, since=%)',
      p.inactive_total_seconds, p.inactive_since;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'email', 'sql-test-s1@school.example.test', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_presence(sess.id, true);
  execute 'reset role';
  select status into v from public.session_participants where session_id = sess.id and user_id = s1;
  if v <> 'inactive' then raise exception 'FAIL set_presence changed a participant of an ended session'; end if;
  r := r || 'PASS end_session freezes inactive time' || E'\n';

  select value into saved_domains from public.app_settings where key = 'allowed_email_domains';
  update public.app_settings set value = '["school.example.test"]' where key = 'allowed_email_domains';
  if public.hook_restrict_signup_domain('{"user":{"email":"kid@school.example.test"}}') <> '{}'::jsonb then
    raise exception 'FAIL hook rejected an allowed domain';
  end if;
  if public.hook_restrict_signup_domain('{"user":{"email":"sql-test-host@example.test"}}') <> '{}'::jsonb then
    raise exception 'FAIL hook rejected a host';
  end if;
  if not public.hook_restrict_signup_domain('{"user":{"email":"x@gmail.com"}}') ? 'error' then
    raise exception 'FAIL hook accepted another domain';
  end if;
  update public.app_settings set value = '[]' where key = 'allowed_email_domains';
  if not public.hook_restrict_signup_domain('{"user":{"email":"kid@school.example.test"}}') ? 'error' then
    raise exception 'FAIL hook with no allowed domains should reject non-hosts';
  end if;
  update public.app_settings set value = saved_domains where key = 'allowed_email_domains';
  r := r || 'PASS sign-up hook whitelist' || E'\n';

  raise exception E'\nALL CHECKS PASSED (rolled back)\n%', r;
end $$;
