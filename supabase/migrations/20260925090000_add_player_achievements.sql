create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  category text not null default 'combate',
  requirement_type text not null,
  requirement_value integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.player_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;

drop policy if exists "Anyone can view achievements" on public.achievements;
create policy "Anyone can view achievements" on public.achievements for select using (true);

drop policy if exists "Users can view their own achievements" on public.player_achievements;
create policy "Users can view their own achievements" on public.player_achievements for select using (user_id = auth.uid());

insert into public.achievements (id, name, description, icon, category, requirement_type, requirement_value, sort_order) values
  ('first_victory', 'Primera victoria', 'Ganaste tu primer combate.', '🏆', 'combate', 'wins', 1, 10),
  ('veteran', 'Veterano', 'Jugaste 10 combates.', '⚔️', 'combate', 'battles', 10, 20),
  ('contender', 'Contendiente', 'Conseguiste 5 victorias.', '🥊', 'combate', 'wins', 5, 30),
  ('champion', 'Campeón', 'Conseguiste 10 victorias.', '👑', 'combate', 'wins', 10, 40),
  ('level_five', 'En ascenso', 'Alcanzaste el nivel 5.', '⭐', 'progreso', 'level', 5, 50),
  ('collector', 'Coleccionista', 'Desbloqueaste 5 personajes.', '🎴', 'coleccion', 'characters', 5, 60),
  ('metamorphosis', 'Metamorfosis', 'Usaste Metamorfosis o Imitación Física en combate.', '🪞', 'habilidades', 'metamorphosis', null, 70),
  ('untouchable', 'Intocable', 'Ganaste un combate sin recibir daño.', '🛡️', 'combate', 'perfect_win', null, 80),
  ('legend', 'Leyenda', 'Alcanzaste el nivel 10.', '🔥', 'progreso', 'level', 10, 90)
on conflict (id) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, category = excluded.category, requirement_type = excluded.requirement_type, requirement_value = excluded.requirement_value, sort_order = excluded.sort_order;

create or replace function public.sync_player_achievements(p_user_id uuid default auth.uid())
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress public.player_progress%rowtype;
  v_unlocked_count integer;
  v_ids text[] := '{}';
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'You can only sync your own achievements'; end if;
  select * into v_progress from public.player_progress where user_id = p_user_id;
  select count(*) into v_unlocked_count from public.character_unlocks where user_id = p_user_id;
  insert into public.player_achievements (user_id, achievement_id)
  select p_user_id, a.id from public.achievements a
  where (a.requirement_type = 'wins' and coalesce(v_progress.wins, 0) >= a.requirement_value)
     or (a.requirement_type = 'battles' and coalesce(v_progress.battles, 0) >= a.requirement_value)
     or (a.requirement_type = 'level' and coalesce(v_progress.level, 1) >= a.requirement_value)
     or (a.requirement_type = 'characters' and v_unlocked_count >= a.requirement_value)
  on conflict (user_id, achievement_id) do nothing;
  select coalesce(array_agg(pa.achievement_id order by pa.unlocked_at), '{}') into v_ids from public.player_achievements pa where pa.user_id = p_user_id;
  return v_ids;
end;
$$;

grant execute on function public.sync_player_achievements(uuid) to authenticated;

create or replace function public.award_online_battle_xp(p_room_id uuid)
returns table(experience_gained integer, total_experience integer, previous_level integer, new_level integer, leveled_up boolean, unlocked_character_ids text[], already_awarded boolean)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_room public.battle_rooms%rowtype; v_existing public.battle_xp_rewards%rowtype; v_won boolean; v_result record; v_winner_user_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text || ':' || auth.uid()::text, 0));
  select * into v_room from public.battle_rooms where id = p_room_id;
  if not found then raise exception 'Battle room not found'; end if;
  if v_room.status <> 'finished' then raise exception 'Battle is not finished'; end if;
  if not exists (select 1 from public.battle_participants where room_id = p_room_id and user_id = auth.uid()) then raise exception 'You did not participate in this battle'; end if;
  select * into v_existing from public.battle_xp_rewards where room_id = p_room_id and user_id = auth.uid();
  if found then perform public.sync_player_achievements(auth.uid()); return query select v_existing.experience_gained, v_existing.total_experience, v_existing.previous_level, v_existing.new_level, v_existing.leveled_up, v_existing.unlocked_character_ids, true; return; end if;
  v_winner_user_id := nullif(v_room.battle_state->>'winner_user_id', '')::uuid; v_won := v_winner_user_id = auth.uid();
  select * into v_result from public.award_battle_xp(auth.uid(), v_won);
  insert into public.battle_xp_rewards (room_id, user_id, experience_gained, total_experience, previous_level, new_level, leveled_up, unlocked_character_ids) values (p_room_id, auth.uid(), v_result.experience_gained, v_result.total_experience, v_result.previous_level, v_result.new_level, v_result.leveled_up, v_result.unlocked_character_ids);
  perform public.sync_player_achievements(auth.uid());
  if v_won and exists (select 1 from jsonb_array_elements(coalesce(v_room.battle_state->'log','[]'::jsonb)) entry where entry->>'user_id' = auth.uid()::text and lower(coalesce(entry->>'action_name','')) in ('metamorfosis','imitación física')) then insert into public.player_achievements (user_id, achievement_id) values (auth.uid(), 'metamorphosis') on conflict do nothing; end if;
  if v_won and coalesce((select sum(coalesce((entry->>'damage')::numeric,0)) from jsonb_array_elements(coalesce(v_room.battle_state->'log','[]'::jsonb)) entry where entry->>'user_id' <> auth.uid()::text), 0) = 0 then insert into public.player_achievements (user_id, achievement_id) values (auth.uid(), 'untouchable') on conflict do nothing; end if;
  return query select v_result.experience_gained, v_result.total_experience, v_result.previous_level, v_result.new_level, v_result.leveled_up, v_result.unlocked_character_ids, false;
end;
$$;

grant execute on function public.award_online_battle_xp(uuid) to authenticated;
