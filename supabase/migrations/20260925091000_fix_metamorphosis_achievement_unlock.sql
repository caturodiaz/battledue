create or replace function public.award_online_battle_xp(p_room_id uuid)
returns table(experience_gained integer, total_experience integer, previous_level integer, new_level integer, leveled_up boolean, unlocked_character_ids text[], already_awarded boolean)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_room public.battle_rooms%rowtype;
  v_existing public.battle_xp_rewards%rowtype;
  v_won boolean;
  v_result record;
  v_winner_user_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text || ':' || auth.uid()::text, 0));
  select * into v_room from public.battle_rooms where id = p_room_id;
  if not found then raise exception 'Battle room not found'; end if;
  if v_room.status <> 'finished' then raise exception 'Battle is not finished'; end if;
  if not exists (select 1 from public.battle_participants where room_id = p_room_id and user_id = auth.uid()) then raise exception 'You did not participate in this battle'; end if;
  select * into v_existing from public.battle_xp_rewards where room_id = p_room_id and user_id = auth.uid();
  if found then
    perform public.sync_player_achievements(auth.uid());
    if exists (select 1 from jsonb_array_elements(coalesce(v_room.battle_state->'log','[]'::jsonb)) entry where entry->>'user_id' = auth.uid()::text and lower(coalesce(entry->>'action_name','')) in ('metamorfosis','imitación física')) then
      insert into public.player_achievements (user_id, achievement_id) values (auth.uid(), 'metamorphosis') on conflict do nothing;
    end if;
    return query select v_existing.experience_gained, v_existing.total_experience, v_existing.previous_level, v_existing.new_level, v_existing.leveled_up, v_existing.unlocked_character_ids, true;
    return;
  end if;
  v_winner_user_id := nullif(v_room.battle_state->>'winner_user_id', '')::uuid;
  v_won := v_winner_user_id = auth.uid();
  select * into v_result from public.award_battle_xp(auth.uid(), v_won);
  insert into public.battle_xp_rewards (room_id, user_id, experience_gained, total_experience, previous_level, new_level, leveled_up, unlocked_character_ids)
  values (p_room_id, auth.uid(), v_result.experience_gained, v_result.total_experience, v_result.previous_level, v_result.new_level, v_result.leveled_up, v_result.leveled_up, v_result.unlocked_character_ids);
  perform public.sync_player_achievements(auth.uid());
  if exists (select 1 from jsonb_array_elements(coalesce(v_room.battle_state->'log','[]'::jsonb)) entry where entry->>'user_id' = auth.uid()::text and lower(coalesce(entry->>'action_name','')) in ('metamorfosis','imitación física')) then
    insert into public.player_achievements (user_id, achievement_id) values (auth.uid(), 'metamorphosis') on conflict do nothing;
  end if;
  if v_won and coalesce((select sum(coalesce((entry->>'damage')::numeric,0)) from jsonb_array_elements(coalesce(v_room.battle_state->'log','[]'::jsonb)) entry where entry->>'user_id' <> auth.uid()::text), 0) = 0 then
    insert into public.player_achievements (user_id, achievement_id) values (auth.uid(), 'untouchable') on conflict do nothing;
  end if;
  return query select v_result.experience_gained, v_result.total_experience, v_result.previous_level, v_result.new_level, v_result.leveled_up, v_result.unlocked_character_ids, false;
end;
$$;

grant execute on function public.award_online_battle_xp(uuid) to authenticated;
