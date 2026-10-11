-- A host can switch a running session between host-paced and self-paced.
--
-- To self-paced: locked questions open, so participants can answer at their own pace. Questions the
-- host already stopped stay stopped.
-- To host-paced: questions nobody has touched, and that start locked, lock again so the host opens
-- them one by one. Questions with answers, or with a timer running, are left as they are.

create function public.set_session_mode(p_session uuid, p_mode public.session_mode)
returns public.sessions
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
begin
  perform public.require_host();
  select * into s from public.sessions where id = p_session for update;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;
  if s.status = 'ended' then
    raise exception 'session_not_active' using errcode = 'P0001';
  end if;
  if s.mode = p_mode then
    return s;
  end if;

  update public.sessions set mode = p_mode where id = p_session returning * into s;

  if p_mode = 'self' then
    update public.session_question_state
      set state = 'open'
      where session_id = p_session and state = 'locked';
  else
    update public.session_question_state st
      set state = 'locked'
      where st.session_id = p_session
        and st.state = 'open'
        and st.ends_at is null
        and coalesce((s.questions -> st.question_id ->> 'startLocked')::boolean, true)
        and not exists (
          select 1 from public.answers a
          where a.session_id = st.session_id and a.question_id = st.question_id
        )
        and not exists (
          select 1 from public.placements pl
          where pl.session_id = st.session_id and pl.question_id = st.question_id
        );
  end if;
  return s;
end $$;

revoke all on function public.set_session_mode(uuid, public.session_mode) from public, anon;
grant execute on function public.set_session_mode(uuid, public.session_mode) to authenticated;
