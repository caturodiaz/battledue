create or replace function public.process_online_battle_action(p_room_id uuid, p_action text, p_ability_index integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.battle_rooms%rowtype;
  v_state jsonb;
  v_players jsonb;
  v_attacker_id uuid;
  v_defender_id uuid;
  v_attacker jsonb;
  v_defender jsonb;
  v_attacker_char public.characters%rowtype;
  v_defender_char public.characters%rowtype;
  v_abilities jsonb;
  v_ability jsonb;
  v_effect jsonb;
  v_effect_type text;
  v_effect_target text;
  v_attacker_states jsonb := '[]'::jsonb;
  v_defender_states jsonb := '[]'::jsonb;
  v_damage numeric := 0;
  v_base_damage numeric := 0;
  v_multiplier numeric := 1;
  v_energy_cost numeric := 0;
  v_energy numeric := 0;
  v_new_energy numeric := 0;
  v_hp numeric;
  v_max_hp numeric;
  v_def_hp numeric;
  v_def_max_hp numeric;
  v_accuracy numeric;
  v_hit boolean := true;
  v_critical boolean := false;
  v_winner_id uuid;
  v_message text;
  v_log jsonb;
  v_round integer;
  v_action_name text := 'Ataque básico';
  v_type text := 'attack';
  v_was_defending boolean := false;
  v_bleeding jsonb;
  v_status jsonb;
  v_target_id uuid;
  v_existing_status jsonb;
  v_existing_stacks integer;
  v_effect_turns integer;
begin
  select * into v_room from public.battle_rooms where id = p_room_id for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_room.status <> 'active' then raise exception 'La batalla no está activa'; end if;
  if not exists (select 1 from public.battle_participants where room_id = p_room_id and user_id = auth.uid()) then raise exception 'No participás en esta batalla'; end if;

  v_state := coalesce(v_room.battle_state, '{}'::jsonb);
  v_players := coalesce(v_state->'players', '{}'::jsonb);
  v_attacker_id := (v_state->>'turn_user_id')::uuid;
  if v_attacker_id <> auth.uid() then raise exception 'No es tu turno'; end if;

  select (key)::uuid into v_defender_id from jsonb_each(v_players) where key <> v_attacker_id::text limit 1;
  if v_defender_id is null then raise exception 'No se encontró oponente'; end if;

  select * into v_attacker_char from public.characters where id = (v_players->v_attacker_id::text->>'character_id');
  select * into v_defender_char from public.characters where id = (v_players->v_defender_id::text->>'character_id');
  if not found then raise exception 'Personaje de combate no encontrado'; end if;

  v_attacker := v_players->v_attacker_id::text;
  v_defender := v_players->v_defender_id::text;
  v_attacker_states := coalesce(v_attacker->'states','[]'::jsonb);
  v_defender_states := coalesce(v_defender->'states','[]'::jsonb);
  v_hp := coalesce((v_attacker->>'hp')::numeric, 0);
  v_max_hp := coalesce((v_attacker->>'max_hp')::numeric, 1);
  v_def_hp := coalesce((v_defender->>'hp')::numeric, 0);
  v_def_max_hp := coalesce((v_defender->>'max_hp')::numeric, 1);
  v_energy := coalesce((v_attacker->>'energy')::numeric, 0);
  v_was_defending := coalesce((v_defender->>'defending')::boolean, false);

  select state into v_bleeding from jsonb_array_elements(v_attacker_states) state where state->>'type' = 'bleeding' limit 1;
  if v_bleeding is not null then
    v_hp := greatest(0, v_hp - greatest(1, floor(v_max_hp * 0.05)) * coalesce((v_bleeding->>'stacks')::numeric,1));
    v_message := format('🩸 Sangrado causa %s de daño.', greatest(1, floor(v_max_hp * 0.05)) * coalesce((v_bleeding->>'stacks')::numeric,1));
  end if;

  if v_hp <= 0 then
    v_winner_id := v_defender_id;
    v_state := jsonb_set(v_state, array['players',v_attacker_id::text,'hp'], to_jsonb(0::numeric), true);
    v_state := jsonb_set(v_state, array['winner_user_id'], to_jsonb(v_winner_id), true);
    v_state := jsonb_set(v_state, array['status'], '"finished"'::jsonb, true);
    update public.battle_rooms set battle_state=v_state, status='finished' where id=p_room_id;
    return v_state;
  end if;

  if exists (select 1 from jsonb_array_elements(v_attacker_states) s where s->>'type'='unconscious') then
    v_hit := false; v_message := '💫 ¡Está inconsciente y no puede atacar!';
  elsif exists (select 1 from jsonb_array_elements(v_attacker_states) s where s->>'type'='stunned') and random() < 0.5 then
    v_hit := false; v_message := '🌀 ¡Está aturdido y falla el ataque!';
  elsif exists (select 1 from jsonb_array_elements(v_defender_states) s where s->>'type'='evasion') and random() < 0.35 then
    v_hit := false; v_message := '💨 ¡El ataque fue esquivado!';
    v_defender_states := (select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(v_defender_states) s where s->>'type' <> 'evasion');
  end if;

  if p_action = 'defend' then
    v_energy := least(100, v_energy + 10);
    v_attacker := jsonb_set(v_attacker, '{defending}', 'true'::jsonb, true);
    v_attacker := jsonb_set(v_attacker, '{energy}', to_jsonb(v_energy), true);
    v_type := 'defend'; v_action_name := 'Defender'; v_message := format('🛡️ %s se prepara para defenderse.', v_attacker_char.name);
  else
    if p_action = 'ultimate' then
      if v_energy < 100 then raise exception 'No tenés energía suficiente'; end if;
      v_energy_cost := 100; v_multiplier := 3; v_action_name := coalesce(v_attacker_char.profile->>'ultimateName','Técnica definitiva'); v_type := 'ultimate';
      v_effect := coalesce(v_attacker_char.profile->'ultimateBattleEffect','null'::jsonb);
    elsif p_action like 'ability-%' then
      if p_ability_index is null then raise exception 'Falta el índice de habilidad'; end if;
      v_abilities := coalesce(v_attacker_char.profile->'abilities','[]'::jsonb);
      v_ability := v_abilities->p_ability_index;
      if v_ability is null then raise exception 'Habilidad inexistente'; end if;
      if v_energy < 25 then raise exception 'No tenés energía suficiente'; end if;
      v_energy_cost := 25; v_multiplier := 1.45 + p_ability_index * 0.15; v_action_name := coalesce(v_ability->>'name','Habilidad'); v_type := 'ability';
      v_effect := coalesce(v_ability->'statusEffect', v_ability->'battleEffect', v_ability->'status', 'null'::jsonb);
    end if;

    if p_action <> 'ultimate' and p_action not like 'ability-%' then v_energy_cost := 0; v_multiplier := 1; end if;
    if v_hit then
      v_accuracy := greatest(50, least(97, 72 + coalesce((v_attacker_char.profile->'stats'->>'control')::numeric,0)*3 + coalesce((v_attacker_char.profile->'stats'->>'range')::numeric,0) - coalesce((v_defender_char.profile->'stats'->>'speed')::numeric,0)*2));
      if p_action <> 'ultimate' and random()*100 > v_accuracy then v_hit := false; v_message := format('💨 %s esquivó el ataque.', v_defender_char.name); end if;
    end if;

    if v_hit then
      if (v_effect->>'type') = 'full_heal_self' or v_effect->>'status' = 'full_heal_self' then
        v_hp := v_max_hp; v_damage := 0; v_message := format('💚 %s recupera toda su vida.', v_attacker_char.name);
      else
        v_base_damage := 6 + coalesce((v_attacker_char.profile->'stats'->>'strength')::numeric,0)*2 + coalesce((v_attacker_char.profile->'stats'->>'range')::numeric,0)*0.8 + coalesce((v_attacker_char.profile->'stats'->>'control')::numeric,0)*0.5;
        v_damage := v_base_damage * (0.8 + random()*0.4) * v_multiplier;
        if random()*100 < least(40, 8 + coalesce((v_attacker_char.profile->'stats'->>'control')::numeric,0)*2 + case when p_action='ultimate' then 15 else 5 end) then v_critical := true; v_damage := v_damage * 1.7; end if;
        v_damage := v_damage * (1 - least(0.5, coalesce((v_defender_char.profile->'stats'->>'defense')::numeric,0)*0.04));
        if exists(select 1 from jsonb_array_elements(v_attacker_states) s where s->>'type'='rage') then v_damage := v_damage*1.25; end if;
        if exists(select 1 from jsonb_array_elements(v_defender_states) s where s->>'type'='rage') then v_damage := v_damage*1.15; end if;
        v_damage := greatest(1, round(v_damage));
        if v_was_defending then v_damage := greatest(1, round(v_damage*0.5)); v_defender := jsonb_set(v_defender,'{defending}','false'::jsonb,true); end if;
        v_def_hp := greatest(0, v_def_hp - v_damage);
        v_message := format('%s %s causa %s de daño a %s.', case when v_critical then '💥 ¡CRÍTICO!' else '⚔️' end, v_attacker_char.name, v_damage, v_defender_char.name);
      end if;
    end if;
    v_new_energy := least(100, greatest(0, v_energy - v_energy_cost + case when p_action='ultimate' then 0 when not v_hit then 8 when v_critical then 18 else 13 end));
    v_attacker := jsonb_set(v_attacker, '{energy}', to_jsonb(v_new_energy), true);
  end if;

  if v_hit and v_effect is not null and v_effect <> 'null'::jsonb then
    v_effect_type := coalesce(v_effect->>'type', v_effect->>'status');
    v_effect_target := coalesce(v_effect->>'target', case when v_effect_type in ('heal_self','full_heal_self','evasion','rage') then 'self' else 'enemy' end);
    v_target_id := case when v_effect_target='self' then v_attacker_id else v_defender_id end;
    if v_effect_type = 'heal_self' then
      v_hp := least(v_max_hp, v_hp + round(v_max_hp * coalesce((v_effect->>'amount')::numeric,0)));
    elsif v_effect_type in ('bleeding','stunned','unconscious','evasion','rage') then
      if v_target_id = v_attacker_id then v_status := v_attacker_states; else v_status := v_defender_states; end if;
      v_effect_turns := coalesce((v_effect->>'turns')::integer, case when v_effect_type='rage' then 2 else 1 end);
      select state into v_existing_status from jsonb_array_elements(v_status) state where state->>'type' = v_effect_type limit 1;
      if v_existing_status is not null then
        v_existing_stacks := coalesce((v_existing_status->>'stacks')::integer, 1);
        v_status := (
          select coalesce(jsonb_agg(
            case
              when state->>'type'=v_effect_type then
                jsonb_set(
                  jsonb_set(state,'{turns}',to_jsonb(v_effect_turns),true),
                  '{stacks}',
                  to_jsonb(case when v_effect_type='bleeding' then least(3,v_existing_stacks + coalesce((v_effect->>'stacks')::integer,1)) else v_existing_stacks end),
                  true
                )
              else state
            end
          ),'[]'::jsonb)
          from jsonb_array_elements(v_status) state
        );
      else
        v_status := v_status || jsonb_build_array(jsonb_build_object('type',v_effect_type,'turns',v_effect_turns,'stacks',coalesce((v_effect->>'stacks')::integer,1)));
      end if;
      if v_target_id = v_attacker_id then v_attacker_states := v_status; else v_defender_states := v_status; end if;
    end if;
  end if;

  v_attacker_states := coalesce((select jsonb_agg(jsonb_set(s,'{turns}',to_jsonb((s->>'turns')::integer-1),true)) from jsonb_array_elements(v_attacker_states) s where (s->>'turns')::integer-1 > 0),'[]'::jsonb);
  v_defender_states := coalesce((select jsonb_agg(jsonb_set(s,'{turns}',to_jsonb((s->>'turns')::integer-1),true)) from jsonb_array_elements(v_defender_states) s where (s->>'turns')::integer-1 > 0),'[]'::jsonb);

  v_attacker := jsonb_set(v_attacker,'{hp}',to_jsonb(greatest(0,v_hp)),true);
  v_attacker := jsonb_set(v_attacker,'{states}',v_attacker_states,true);
  v_defender := jsonb_set(v_defender,'{hp}',to_jsonb(greatest(0,v_def_hp)),true);
  v_defender := jsonb_set(v_defender,'{states}',v_defender_states,true);
  v_round := coalesce((v_state->>'round')::integer,1) + 1;
  v_log := coalesce(v_state->'log','[]'::jsonb) || jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'user_id',v_attacker_id,'action',p_action,'action_name',v_action_name,'type',v_type,'message',v_message,'damage',v_damage,'critical',v_critical));
  v_players := jsonb_set(v_players,array[v_attacker_id::text],v_attacker,true);
  v_players := jsonb_set(v_players,array[v_defender_id::text],v_defender,true);
  v_state := jsonb_set(v_state,'{players}',v_players,true);
  v_state := jsonb_set(v_state,'{round}',to_jsonb(v_round),true);
  v_state := jsonb_set(v_state,'{log}',v_log,true);

  if v_def_hp <= 0 then
    v_winner_id := v_attacker_id;
    v_state := jsonb_set(v_state,'{winner_user_id}',to_jsonb(v_winner_id),true);
    v_state := jsonb_set(v_state,'{status}','"finished"'::jsonb,true);
    update public.battle_rooms set battle_state=v_state,status='finished' where id=p_room_id;
  else
    v_state := jsonb_set(v_state,'{turn_user_id}',to_jsonb(v_defender_id),true);
    update public.battle_rooms set battle_state=v_state where id=p_room_id;
  end if;
  return v_state;
end;
$$;