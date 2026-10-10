create table public.hosts (
  email text primary key check (email = lower(email))
);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);

insert into public.app_settings (key, value)
values ('allowed_email_domains', '[]');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_host() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.hosts h where h.email = lower(auth.jwt() ->> 'email')
  )
$$;

create function public.hook_restrict_signup_domain(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  addr text := lower(event -> 'user' ->> 'email');
  domain text := split_part(addr, '@', 2);
  allowed jsonb;
begin
  if addr is null or addr = '' then
    return jsonb_build_object('error', jsonb_build_object('message', 'An email address is required.', 'http_code', 400));
  end if;
  if exists (select 1 from public.hosts where email = addr) then
    return '{}'::jsonb;
  end if;
  select value into allowed from public.app_settings where key = 'allowed_email_domains';
  if allowed is not null and allowed ? domain then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error',
    jsonb_build_object('message', 'Sign-up is limited to approved school email addresses.', 'http_code', 403)
  );
end $$;

grant execute on function public.hook_restrict_signup_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_domain(jsonb) from public, anon, authenticated;

create type public.session_mode as enum ('self', 'host');
create type public.session_status as enum ('active', 'ended');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  deck_id text not null,
  deck_title text,
  mode public.session_mode not null,
  status public.session_status not null default 'active',
  host_id uuid not null references auth.users (id),
  current_index int not null default 0,
  current_step int not null default 0,
  page_count int not null default 0,
  questions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index sessions_status_idx on public.sessions (status, created_at desc);
create index sessions_deck_idx on public.sessions (deck_id);

create table public.session_participants (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'inactive')),
  inactive_since timestamptz,
  inactive_total_seconds int not null default 0,
  self_index int not null default 0,
  primary key (session_id, user_id)
);

create table public.presence_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('active', 'inactive')),
  at timestamptz not null default now()
);

create index presence_events_session_idx on public.presence_events (session_id, user_id, at);

create table public.session_question_state (
  session_id uuid not null references public.sessions (id) on delete cascade,
  question_id text not null,
  state text not null check (state in ('locked', 'open', 'ended')),
  ends_at timestamptz,
  show_results boolean not null default false,
  primary key (session_id, question_id)
);

create table public.answer_keys (
  session_id uuid not null references public.sessions (id) on delete cascade,
  question_id text not null,
  correct_option_ids text[] not null default '{}',
  primary key (session_id, question_id)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  question_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  option_id text not null,
  is_correct boolean,
  submitted_at timestamptz not null default now(),
  unique (session_id, question_id, user_id)
);

create index answers_question_idx on public.answers (session_id, question_id);

create function public.is_participant(p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.session_participants sp
    where sp.session_id = p_session and sp.user_id = auth.uid()
  )
$$;

alter table public.hosts enable row level security;
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.presence_events enable row level security;
alter table public.session_question_state enable row level security;
alter table public.answer_keys enable row level security;
alter table public.answers enable row level security;

create policy profiles_self on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_host());

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy hosts_read_self on public.hosts for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy sessions_read on public.sessions for select to authenticated
  using (public.is_host() or public.is_participant(id));

create policy participants_read on public.session_participants for select to authenticated
  using (public.is_host() or user_id = auth.uid());

create policy presence_events_host_read on public.presence_events for select to authenticated
  using (public.is_host());

create policy question_state_read on public.session_question_state for select to authenticated
  using (public.is_host() or public.is_participant(session_id));

create policy answer_keys_host_read on public.answer_keys for select to authenticated
  using (public.is_host());

create policy answers_host_read on public.answers for select to authenticated
  using (public.is_host());

create function public.gen_session_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.sessions where code = candidate);
  end loop;
  return candidate;
end $$;

create function public.require_host() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_host() then
    raise exception 'host_only' using errcode = '42501';
  end if;
end $$;

create function public.create_session(
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
begin
  perform public.require_host();
  insert into public.sessions (code, deck_id, deck_title, mode, host_id, page_count, questions)
  values (
    public.gen_session_code(), p_deck_id, p_deck_title, p_mode, auth.uid(),
    coalesce(p_page_count, 0), coalesce(p_questions, '{}'::jsonb)
  )
  returning * into s;

  for q in select key, value from jsonb_each(s.questions) loop
    select coalesce(array_agg(v), '{}') into correct
    from jsonb_array_elements_text(coalesce(q.value -> 'correct', '[]'::jsonb)) as v;

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

create function public.end_session(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  update public.sessions set status = 'ended', ended_at = now() where id = p_session and status = 'active';
  update public.session_participants
    set inactive_total_seconds = inactive_total_seconds
      + case when status = 'inactive' then extract(epoch from now() - inactive_since)::int else 0 end,
      status = 'inactive', inactive_since = now()
    where session_id = p_session and status = 'active';
end $$;

create function public.delete_session(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  delete from public.sessions where id = p_session;
end $$;

create function public.join_session(p_code text) returns public.sessions
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

  insert into public.session_participants (session_id, user_id, display_name, email)
  values (s.id, auth.uid(), prof.display_name, prof.email)
  on conflict (session_id, user_id) do update
    set last_seen = now(),
        inactive_total_seconds = public.session_participants.inactive_total_seconds
          + case when public.session_participants.status = 'inactive'
              then extract(epoch from now() - public.session_participants.inactive_since)::int else 0 end,
        status = 'active', inactive_since = null;
  insert into public.presence_events (session_id, user_id, status) values (s.id, auth.uid(), 'active');
  return s;
end $$;

create function public.set_presence(p_session uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cur public.session_participants;
begin
  select * into cur from public.session_participants
    where session_id = p_session and user_id = auth.uid() for update;
  if not found then return; end if;
  if p_active and cur.status = 'inactive' then
    update public.session_participants
      set status = 'active', last_seen = now(),
          inactive_total_seconds = inactive_total_seconds + extract(epoch from now() - inactive_since)::int,
          inactive_since = null
      where session_id = p_session and user_id = auth.uid();
    insert into public.presence_events (session_id, user_id, status) values (p_session, auth.uid(), 'active');
  elsif not p_active and cur.status = 'active' then
    update public.session_participants
      set status = 'inactive', inactive_since = now(), last_seen = now()
      where session_id = p_session and user_id = auth.uid();
    insert into public.presence_events (session_id, user_id, status) values (p_session, auth.uid(), 'inactive');
  else
    update public.session_participants set last_seen = now()
      where session_id = p_session and user_id = auth.uid();
  end if;
end $$;

create function public.set_position(p_session uuid, p_index int, p_step int default 0) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_host() then
    update public.sessions set current_index = p_index, current_step = p_step
      where id = p_session and status = 'active';
  elsif public.is_participant(p_session) then
    update public.session_participants set self_index = p_index
      where session_id = p_session and user_id = auth.uid();
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create function public.host_question_action(
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
    update public.session_question_state set state = 'locked', ends_at = null
      where session_id = p_session and question_id = p_question
        and state = 'open' and ends_at is not null and ends_at <= now();
  else
    raise exception 'bad_action' using errcode = '22023';
  end if;

  select * into st from public.session_question_state
    where session_id = p_session and question_id = p_question;
  return st;
end $$;

create function public.set_show_results(p_session uuid, p_question text, p_value boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_host();
  update public.session_question_state set show_results = p_value
    where session_id = p_session and question_id = p_question;
end $$;

create function public.toggle_correct_option(p_session uuid, p_question text, p_option text)
returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  result text[];
begin
  perform public.require_host();
  if not exists (
    select 1 from public.sessions s,
      jsonb_array_elements(s.questions -> p_question -> 'options') o
    where s.id = p_session and o ->> 'id' = p_option
  ) then
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
  return result;
end $$;

create function public.recompute_answer_correctness() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.answers a
    set is_correct = case
      when cardinality(new.correct_option_ids) = 0 then null
      else a.option_id = any (new.correct_option_ids)
    end
    where a.session_id = new.session_id and a.question_id = new.question_id;
  return new;
end $$;

create trigger answer_keys_recompute
after insert or update of correct_option_ids on public.answer_keys
for each row execute function public.recompute_answer_correctness();

create function public.submit_answer(p_session uuid, p_question text, p_option text)
returns public.answers
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  st public.session_question_state;
  key public.answer_keys;
  result public.answers;
  answered int;
  joined int;
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
    select count(*) into joined from public.session_participants where session_id = p_session;
    if answered >= joined then
      update public.session_question_state set state = 'ended', ends_at = null
        where session_id = p_session and question_id = p_question;
    end if;
  end if;
  return result;
end $$;

create function public.my_answers(p_session uuid)
returns table (question_id text, option_id text, is_correct boolean, show_results boolean)
language sql stable security definer set search_path = '' as $$
  select a.question_id, a.option_id,
         case when st.show_results then a.is_correct end,
         st.show_results
  from public.answers a
  join public.session_question_state st
    on st.session_id = a.session_id and st.question_id = a.question_id
  where a.session_id = p_session and a.user_id = auth.uid()
$$;

create function public.my_score(p_session uuid)
returns table (correct int, graded int, class_average numeric)
language sql stable security definer set search_path = '' as $$
  with visible as (
    select a.* from public.answers a
    join public.session_question_state st
      on st.session_id = a.session_id and st.question_id = a.question_id and st.show_results
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

create function public.list_active_sessions()
returns table (id uuid, code text, deck_id text, deck_title text, mode public.session_mode, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.code, s.deck_id, s.deck_title, s.mode, s.created_at
  from public.sessions s
  where s.status = 'active' and auth.uid() is not null
  order by s.created_at desc
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'is_host()', 'is_participant(uuid)', 'require_host()', 'gen_session_code()',
    'create_session(text,text,public.session_mode,int,jsonb)', 'end_session(uuid)',
    'delete_session(uuid)', 'join_session(text)', 'set_presence(uuid,boolean)',
    'set_position(uuid,int,int)', 'host_question_action(uuid,text,text,int)',
    'set_show_results(uuid,text,boolean)', 'toggle_correct_option(uuid,text,text)',
    'submit_answer(uuid,text,text)', 'my_answers(uuid)', 'my_score(uuid)', 'list_active_sessions()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;

revoke all on function public.require_host() from authenticated;
revoke all on function public.gen_session_code() from authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.recompute_answer_correctness() from public, anon, authenticated;

alter publication supabase_realtime add table
  public.sessions,
  public.session_participants,
  public.session_question_state,
  public.answers,
  public.answer_keys;
