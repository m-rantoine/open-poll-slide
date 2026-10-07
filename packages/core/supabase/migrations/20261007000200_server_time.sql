create function public.server_time() returns timestamptz
language sql stable set search_path = '' as $$ select now() $$;

revoke all on function public.server_time() from public, anon;
grant execute on function public.server_time() to authenticated;
