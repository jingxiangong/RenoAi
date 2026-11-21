create table if not exists public.reno_qwen_calls (
  id bigint generated always as identity primary key,
  usage_day date not null,
  account_id text not null,
  request_id text not null,
  stage text not null check (stage in ('extract', 'clarify', 'repair'))
);

alter table public.reno_qwen_calls enable row level security;
revoke all on table public.reno_qwen_calls from public, anon, authenticated;
create index if not exists reno_qwen_calls_daily_idx
  on public.reno_qwen_calls (usage_day, account_id);
create index if not exists reno_qwen_calls_request_idx
  on public.reno_qwen_calls (account_id, request_id, stage);

create or replace function public.reno_reserve_qwen_call(
  p_account_id text,
  p_request_id text,
  p_stage text,
  p_account_daily_limit integer,
  p_site_daily_limit integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
  v_request_calls bigint;
  v_clarification_calls bigint;
  v_site_calls bigint;
  v_account_calls bigint;
begin
  if p_account_id is null or p_request_id is null
    or p_stage is null or p_stage not in ('extract', 'clarify', 'repair')
    or coalesce(p_account_daily_limit, 0) < 1 or coalesce(p_site_daily_limit, 0) < 1 then
    raise exception 'Invalid quota reservation';
  end if;

  -- Serialize reservations across app instances. The provider call runs outside this transaction.
  perform pg_catalog.pg_advisory_xact_lock(84350912);
  v_day := (pg_catalog.clock_timestamp() at time zone 'UTC')::date;

  select count(*), count(*) filter (where stage = 'clarify')
    into v_request_calls, v_clarification_calls
    from public.reno_qwen_calls
    where account_id = p_account_id and request_id = p_request_id;

  if p_stage = 'clarify' and v_clarification_calls >= 1 then
    return 'clarification_limit';
  end if;
  -- Leave the final slot available for repair analysis.
  if v_request_calls >= 3 or (p_stage <> 'repair' and v_request_calls >= 2) then
    return 'request_limit';
  end if;

  select count(*), count(*) filter (where account_id = p_account_id)
    into v_site_calls, v_account_calls
    from public.reno_qwen_calls
    where usage_day = v_day;

  if v_account_calls >= p_account_daily_limit then
    return 'account_limit';
  end if;
  if v_site_calls >= p_site_daily_limit then
    return 'site_limit';
  end if;

  insert into public.reno_qwen_calls (usage_day, account_id, request_id, stage)
    values (v_day, p_account_id, p_request_id, p_stage);
  return 'allowed';
end;
$$;

revoke all on function public.reno_reserve_qwen_call(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reno_reserve_qwen_call(text, text, text, integer, integer)
  to service_role;
