create or replace function public.record_achievement_event(p_achievement_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_achievement_id <> 'metamorphosis' then
    raise exception 'Unsupported achievement event';
  end if;

  if not exists (select 1 from public.achievements where id = p_achievement_id) then
    raise exception 'Achievement not found';
  end if;

  insert into public.player_achievements (user_id, achievement_id)
  values (auth.uid(), p_achievement_id)
  on conflict (user_id, achievement_id) do nothing;

  return true;
end;
$$;

grant execute on function public.record_achievement_event(text) to authenticated;
