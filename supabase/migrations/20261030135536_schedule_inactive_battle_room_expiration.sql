create extension if not exists pg_cron with schema pg_catalog;

create index if not exists battle_rooms_expiration_idx
  on public.battle_rooms (updated_at)
  where status in ('waiting', 'ready', 'active');

create or replace function public.expire_inactive_battle_rooms(
  p_timeout interval default interval '30 minutes'
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expired_count integer;
begin
  update public.battle_rooms
  set
    status = 'cancelled',
    battle_state = case
      when battle_state is null then null
      else jsonb_set(battle_state, '{status}', '"cancelled"'::jsonb, true)
    end
  where status in ('waiting', 'ready', 'active')
    and updated_at < now() - p_timeout;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke all on function public.expire_inactive_battle_rooms(interval) from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'expire-inactive-battle-rooms';

select cron.schedule(
  'expire-inactive-battle-rooms',
  '*/15 * * * *',
  $$select public.expire_inactive_battle_rooms();$$
);
