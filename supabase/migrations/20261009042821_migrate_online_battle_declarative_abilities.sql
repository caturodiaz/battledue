-- Resolve online battle actions from the same declarative ability data as the local engine.
-- This migration intentionally keeps Tokata's metamorphosis as a server-owned special action.
-- SECURITY DEFINER is retained because the RPC updates battle state, but the search_path is
-- empty and every application object is schema-qualified.

create or replace function public.process_online_battle_action(
  p_room_id uuid,
  p_action text,
  p_ability_index integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
  v_combat jsonb := '{}'::jsonb;
  v_effects jsonb := '[]'::jsonb;
  v_effect jsonb;
  v_effect_type text;
  v_effect_target text;
  v_target_id uuid;
  v_attacker_states jsonb := '[]'::jsonb;
  v_defender_states jsonb := '[]'::jsonb;
  v_target_states jsonb;
  v_existing_state jsonb;
  v_next_states jsonb;
  v_state_type text;
  v_applied_state_types text[] := array[]::text[];
  v_has_damage boolean := false;
  v_is_tokata boolean := false;
  v_is_transformed boolean := false;
  v_is_metamorphosis boolean := false;
  v_tokata_id constant text := '1866b4d1-b0a2-4dfd-96ff-4e3f4f014813';
  v_hp numeric := 0;
  v_max_hp numeric := 1;
  v_def_hp numeric := 0;
  v_def_max_hp numeric := 1;
  v_energy numeric := 0;
  v_def_energy numeric := 0;
  v_new_energy numeric := 0;
  v_energy_cost numeric := 0;
  v_energy_gain numeric := 0;
  v_damage numeric := 0;
  v_effect_damage numeric := 0;
  v_total_healing numeric := 0;
  v_amount numeric := 0;
  v_base_damage numeric := 0;
  v_multiplier numeric := 1;
  v_accuracy numeric := 72;
  v_critical_bonus numeric := 5;
  v_critical boolean := false;
  v_hit boolean := true;
  v_guaranteed_hit boolean := false;
  v_was_defending boolean := false;
  v_message text;
  v_log jsonb;
  v_round integer;
  v_action_name text := 'Ataque básico';
  v_type text := 'attack';
  v_resource text;
  v_resource_value numeric;
  v_state_turns integer;
  v_state_stacks integer;
  v_winner_id uuid;
  v_bleeding_damage numeric := 0;
  v_start_turn_message text;
begin
  select * into v_room
  from public.battle_rooms
  where id = p_room_id
  for update;

  if not found then raise exception 'Sala no encontrada'; end if;
  if v_room.status <> 'active' then raise exception 'La batalla no está activa'; end if;
  if not exists (
    select 1 from public.battle_participants
    where room_id = p_room_id and user_id = auth.uid()
  ) then
    raise exception 'No participás en esta batalla';
  end if;

  v_state := coalesce(v_room.battle_state, '{}'::jsonb);
  v_players := coalesce(v_state->'players', '{}'::jsonb);
  v_attacker_id := (v_state->>'turn_user_id')::uuid;
  if v_attacker_id <> auth.uid() then raise exception 'No es tu turno'; end if;

  select (key)::uuid into v_defender_id
  from jsonb_each(v_players)
  where key <> v_attacker_id::text
  limit 1;
  if v_defender_id is null then raise exception 'No se encontró oponente'; end if;

  select * into v_attacker_char
  from public.characters
  where id = (v_players->v_attacker_id::text->>'character_id');
  select * into v_defender_char
  from public.characters
  where id = (v_players->v_defender_id::text->>'character_id');
  if v_attacker_char.id is null or v_defender_char.id is null then
    raise exception 'Personaje de combate no encontrado';
  end if;

  v_attacker := v_players->v_attacker_id::text;
  v_defender := v_players->v_defender_id::text;
  v_attacker_states := coalesce(v_attacker->'states', '[]'::jsonb);
  v_defender_states := coalesce(v_defender->'states', '[]'::jsonb);
  v_hp := coalesce((v_attacker->>'hp')::numeric, 0);
  v_max_hp := greatest(1, coalesce((v_attacker->>'max_hp')::numeric, 1));
  v_def_hp := coalesce((v_defender->>'hp')::numeric, 0);
  v_def_max_hp := greatest(1, coalesce((v_defender->>'max_hp')::numeric, 1));
  v_energy := least(100, greatest(0, coalesce((v_attacker->>'energy')::numeric, 0)));
  v_def_energy := least(100, greatest(0, coalesce((v_defender->>'energy')::numeric, 0)));
  v_was_defending := coalesce((v_defender->>'defending')::boolean, false);

  -- Resolve bleeding at the start of the acting player's turn.
  select s into v_existing_state
  from jsonb_array_elements(v_attacker_states) s
  where s->>'type' = 'bleeding'
  limit 1;
  if v_existing_state is not null then
    v_bleeding_damage := greatest(1, floor(v_max_hp * 0.05))
      * greatest(1, coalesce((v_existing_state->>'stacks')::numeric, 1));
    v_hp := greatest(0, v_hp - v_bleeding_damage);
    v_start_turn_message := format('🩸 Sangrado causa %s de daño.', v_bleeding_damage);
    if v_hp <= 0 then
      v_attacker := jsonb_set(v_attacker, '{hp}', to_jsonb(0::numeric), true);
      v_attacker := jsonb_set(v_attacker, '{states}', v_attacker_states, true);
      v_players := jsonb_set(v_players, array[v_attacker_id::text], v_attacker, true);
      v_state := jsonb_set(v_state, '{players}', v_players, true);
      v_state := jsonb_set(v_state, '{winner_user_id}', to_jsonb(v_defender_id), true);
      v_state := jsonb_set(v_state, '{status}', to_jsonb('finished'::text), true);
      v_log := coalesce(v_state->'log', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', pg_catalog.gen_random_uuid(),
        'user_id', v_attacker_id,
        'action', 'status_tick',
        'action_name', 'Sangrado',
        'type', 'status',
        'message', v_start_turn_message,
        'damage', v_bleeding_damage,
        'critical', false
      ));
      v_state := jsonb_set(v_state, '{log}', v_log, true);
      update public.battle_rooms set battle_state = v_state, status = 'finished' where id = p_room_id;
      return v_state;
    end if;
  end if;

  v_is_tokata := v_attacker_char.id::text = v_tokata_id or v_attacker_char.name = 'Tokata';
  v_is_transformed := v_is_tokata
    and (v_attacker->'tokata_transformation'->>'transformed_character_id') is not null;

  if p_action = 'defend' then
    v_new_energy := least(100, v_energy + 10);
    v_attacker := jsonb_set(v_attacker, '{defending}', 'true'::jsonb, true);
    v_attacker := jsonb_set(v_attacker, '{energy}', to_jsonb(v_new_energy), true);
    v_type := 'defend';
    v_action_name := 'Defender';
    v_message := format('🛡️ %s se prepara para defenderse.', v_attacker_char.name);
  else
    if p_action = 'ultimate' then
      v_ability := v_attacker_char.profile->'ultimateAbility';
      if v_ability is null or jsonb_typeof(v_ability) <> 'object' then
        raise exception 'La técnica definitiva no tiene una definición declarativa';
      end if;
      v_combat := coalesce(v_ability->'combat', '{}'::jsonb);
      v_action_name := coalesce(v_ability->>'name', v_attacker_char.profile->>'ultimateName', 'Técnica definitiva');
      v_type := 'ultimate';
      v_energy_cost := greatest(0, coalesce((v_ability->'costs'->>'energy')::numeric, 100));
    elsif p_action like 'ability-%' then
      if p_ability_index is null or p_ability_index < 0 then
        raise exception 'Falta el índice de habilidad';
      end if;
      if v_is_transformed then
        v_abilities := coalesce(v_attacker->'tokata_transformation'->'copied_abilities', '[]'::jsonb);
      else
        v_abilities := coalesce(v_attacker_char.profile->'abilities', '[]'::jsonb);
      end if;
      v_ability := v_abilities->p_ability_index;
      if v_ability is null or jsonb_typeof(v_ability) <> 'object' then
        raise exception 'Habilidad inexistente';
      end if;
      v_is_metamorphosis := v_is_tokata
        and not v_is_transformed
        and lower(coalesce(v_ability->>'name', '')) in ('metamorfosis', 'imitación física');
      v_combat := coalesce(v_ability->'combat', '{}'::jsonb);
      v_action_name := coalesce(v_ability->>'name', 'Habilidad');
      v_type := 'ability';
      if v_is_metamorphosis then
        v_new_energy := v_energy;
        v_message := format('🪞 %s adopta la forma de %s.', v_attacker_char.name, v_defender_char.name);
        v_attacker := jsonb_set(
          v_attacker,
          '{tokata_transformation}',
          jsonb_build_object(
            'transformed_character_id', v_defender_char.id,
            'transformed_character_name', v_defender_char.name,
            'transformed_character_image', coalesce(v_defender_char.profile->>'primaryImage', v_defender_char.image, ''),
            'copied_abilities', coalesce((
              select jsonb_agg(a)
              from jsonb_array_elements(coalesce(v_defender_char.profile->'abilities', '[]'::jsonb)) a
              where coalesce((a->>'isUltimate')::boolean, false) = false
                and coalesce((a->>'ultimate')::boolean, false) = false
                and coalesce(a->>'type', '') <> 'ultimate'
                and coalesce(a->>'kind', '') <> 'ultimate'
            ), '[]'::jsonb)
          ),
          true
        );
      else
        v_energy_cost := greatest(0, coalesce((v_ability->'costs'->>'energy')::numeric, 25));
      end if;
    elsif p_action <> 'basic' then
      raise exception 'Acción no soportada: %', p_action;
    end if;

    if not v_is_metamorphosis and v_energy < v_energy_cost then
      raise exception 'No tenés energía suficiente';
    end if;

    if not v_is_metamorphosis then
      if jsonb_typeof(v_ability->'steps') = 'array'
        and jsonb_array_length(v_ability->'steps') > 0 then
        select coalesce(jsonb_agg(effect order by step_ord, effect_ord), '[]'::jsonb)
        into v_effects
        from jsonb_array_elements(v_ability->'steps') with ordinality as s(step, step_ord)
        cross join lateral jsonb_array_elements(coalesce(s.step->'effects', '[]'::jsonb))
          with ordinality as e(effect, effect_ord);
      elsif p_action = 'basic' then
        v_effects := jsonb_build_array(jsonb_build_object('type', 'damage_resolve', 'multiplier', 1));
        v_combat := jsonb_build_object('criticalBonus', 5);
        v_action_name := 'Ataque básico';
        v_type := 'attack';
      else
        v_effects := coalesce(v_ability->'effects', '[]'::jsonb);
      end if;

      v_has_damage := exists (
        select 1 from jsonb_array_elements(v_effects) effect
        where effect->>'type' in ('damage_resolve', 'damage')
      );
      v_guaranteed_hit := coalesce((v_combat->>'guaranteedHit')::boolean, false);
      v_critical_bonus := coalesce(
        (v_combat->>'criticalBonus')::numeric,
        case when p_action = 'ultimate' then 15 else 5 end
      );

      if v_has_damage then
        if exists (select 1 from jsonb_array_elements(v_attacker_states) s where s->>'type' = 'unconscious') then
          v_hit := false;
          v_message := '💫 ¡Está inconsciente y no puede actuar!';
        elsif exists (select 1 from jsonb_array_elements(v_attacker_states) s where s->>'type' = 'stunned')
          and pg_catalog.random() < 0.5 then
          v_hit := false;
          v_message := '🌀 ¡Está aturdido y falla la acción!';
        elsif exists (select 1 from jsonb_array_elements(v_defender_states) s where s->>'type' = 'evasion')
          and pg_catalog.random() < 0.35 then
          v_hit := false;
          v_message := '💨 ¡El ataque fue esquivado!';
          select coalesce(jsonb_agg(s), '[]'::jsonb) into v_defender_states
          from jsonb_array_elements(v_defender_states) s
          where s->>'type' <> 'evasion';
        end if;

        v_accuracy := greatest(50, least(
          97,
          72
            + coalesce((v_attacker_char.profile->'stats'->>'control')::numeric, 0) * 3
            + coalesce((v_attacker_char.profile->'stats'->>'range')::numeric, 0)
            - coalesce((v_defender_char.profile->'stats'->>'speed')::numeric, 0) * 2
        ));
        if v_hit and not v_guaranteed_hit and pg_catalog.random() * 100 > v_accuracy then
          v_hit := false;
          v_message := format('💨 %s esquivó el ataque.', v_defender_char.name);
        end if;

        if v_hit then
          v_critical := pg_catalog.random() * 100 < least(
            40,
            greatest(0, 8 + coalesce((v_attacker_char.profile->'stats'->>'control')::numeric, 0) * 2 + v_critical_bonus)
          );
        end if;
      end if;

      for v_effect in select value from jsonb_array_elements(v_effects)
      loop
        v_effect_type := v_effect->>'type';
        if not v_hit
          and coalesce((v_effect->>'requiresHit')::boolean, true)
          and v_effect_type in ('damage_resolve', 'damage', 'heal', 'state_add', 'state_remove', 'state_stack_add', 'state_stack_remove') then
          continue;
        end if;

        v_effect_target := coalesce(v_effect->>'target', 'enemy');
        v_target_id := case when v_effect_target in ('self', 'source') then v_attacker_id else v_defender_id end;

        if v_effect_type in ('damage_resolve', 'damage') then
          if v_effect_type = 'damage_resolve' then
            v_multiplier := coalesce(
              (v_effect->>'multiplier')::numeric,
              (v_combat->>'multiplier')::numeric,
              1
            );
            v_base_damage := 4.8
              + coalesce((v_attacker_char.profile->'stats'->>'strength')::numeric, 0) * 2
              + coalesce((v_attacker_char.profile->'stats'->>'range')::numeric, 0) * 0.8
              + coalesce((v_attacker_char.profile->'stats'->>'control')::numeric, 0) * 0.5;
            v_effect_damage := v_base_damage * v_multiplier * (0.8 + pg_catalog.random() * 0.4);
            if v_critical then v_effect_damage := v_effect_damage * 1.7; end if;
            v_effect_damage := v_effect_damage * (
              1 - least(0.5, coalesce((v_defender_char.profile->'stats'->>'defense')::numeric, 0) * 0.06)
            );
            if exists (select 1 from jsonb_array_elements(v_attacker_states) s where s->>'type' = 'rage') then
              v_effect_damage := v_effect_damage * 1.25;
            end if;
            if exists (select 1 from jsonb_array_elements(v_defender_states) s where s->>'type' = 'rage') then
              v_effect_damage := v_effect_damage * 1.15;
            end if;
            if v_was_defending then
              v_effect_damage := v_effect_damage * 0.5;
              v_was_defending := false;
              v_defender := jsonb_set(v_defender, '{defending}', 'false'::jsonb, true);
            end if;
            v_effect_damage := greatest(1, round(v_effect_damage));
          else
            v_effect_damage := greatest(0, coalesce((v_effect->>'value')::numeric, 0));
          end if;

          if v_target_id = v_attacker_id then
            v_hp := greatest(0, v_hp - v_effect_damage);
          else
            v_def_hp := greatest(0, v_def_hp - v_effect_damage);
          end if;
          v_damage := v_damage + v_effect_damage;

        elsif v_effect_type = 'heal' then
          if coalesce((v_effect->>'full')::boolean, false) then
            v_amount := case when v_target_id = v_attacker_id then v_max_hp - v_hp else v_def_max_hp - v_def_hp end;
          elsif v_effect ? 'percent' then
            v_amount := (case when v_target_id = v_attacker_id then v_max_hp else v_def_max_hp end)
              * greatest(0, coalesce((v_effect->>'percent')::numeric, 0));
          else
            v_amount := greatest(0, coalesce((v_effect->>'value')::numeric, 0));
          end if;
          if v_target_id = v_attacker_id then
            v_amount := least(v_amount, v_max_hp - v_hp);
            v_hp := least(v_max_hp, v_hp + greatest(0, v_amount));
          else
            v_amount := least(v_amount, v_def_max_hp - v_def_hp);
            v_def_hp := least(v_def_max_hp, v_def_hp + greatest(0, v_amount));
          end if;
          v_total_healing := v_total_healing + greatest(0, v_amount);

        elsif v_effect_type = 'state_add' then
          v_state_type := coalesce(v_effect->>'state', '');
          if v_state_type = '' then raise exception 'El efecto % necesita state', v_effect_type; end if;
          v_state_turns := greatest(0, coalesce((v_effect->>'duration')::integer, (v_effect->>'turns')::integer, 1));
          v_state_stacks := greatest(1, coalesce((v_effect->>'stacks')::integer, 1));
          v_target_states := case when v_target_id = v_attacker_id then v_attacker_states else v_defender_states end;
          select s into v_existing_state
          from jsonb_array_elements(v_target_states) s
          where s->>'type' = v_state_type
          limit 1;
          if v_existing_state is null then
            v_target_states := v_target_states || jsonb_build_array(
              jsonb_build_object('type', v_state_type, 'turns', v_state_turns, 'stacks', v_state_stacks)
            );
          else
            select coalesce(jsonb_agg(
              case when s->>'type' = v_state_type then
                jsonb_set(
                  jsonb_set(s, '{turns}', to_jsonb(greatest(coalesce((s->>'turns')::integer, 0), v_state_turns)), true),
                  '{stacks}',
                  to_jsonb(case when v_state_type = 'bleeding'
                    then least(3, coalesce((s->>'stacks')::integer, 1) + v_state_stacks)
                    else coalesce((s->>'stacks')::integer, v_state_stacks) end),
                  true
                )
              else s end
            ), '[]'::jsonb) into v_next_states
            from jsonb_array_elements(v_target_states) s;
            v_target_states := v_next_states;
          end if;
          if v_target_id = v_attacker_id then
            v_attacker_states := v_target_states;
            v_applied_state_types := array_append(v_applied_state_types, v_state_type);
          else
            v_defender_states := v_target_states;
          end if;

        elsif v_effect_type = 'state_remove' then
          v_state_type := coalesce(v_effect->>'state', '');
          if v_state_type <> '' then
            v_target_states := case when v_target_id = v_attacker_id then v_attacker_states else v_defender_states end;
            select coalesce(jsonb_agg(s), '[]'::jsonb) into v_next_states
            from jsonb_array_elements(v_target_states) s
            where s->>'type' <> v_state_type;
            if v_target_id = v_attacker_id then
              v_attacker_states := v_next_states;
            else
              v_defender_states := v_next_states;
            end if;
          end if;

        elsif v_effect_type = 'resource_add' then
          v_resource := coalesce(v_effect->>'resource', 'energy');
          v_resource_value := coalesce((v_effect->>'value')::numeric, 0);
          if v_resource <> 'energy' then
            raise exception 'Recurso online no soportado: %', v_resource;
          end if;
          if v_target_id = v_attacker_id then
            v_energy := least(100, greatest(0, v_energy + v_resource_value));
          else
            v_def_energy := least(100, greatest(0, v_def_energy + v_resource_value));
          end if;

        else
          raise exception 'Efecto declarativo online no soportado: %', v_effect_type;
        end if;
      end loop;

      if v_has_damage then
        v_energy_gain := case when p_action = 'ultimate' then 0 when not v_hit then 8 when v_critical then 18 else 13 end;
      else
        v_energy_gain := 0;
      end if;
      v_new_energy := least(100, greatest(0, v_energy - v_energy_cost + v_energy_gain));
      if not v_is_metamorphosis then
        v_attacker := jsonb_set(v_attacker, '{energy}', to_jsonb(v_new_energy), true);
      end if;

      if v_has_damage and v_hit then
        v_message := format('%s %s causa %s de daño a %s.',
          case when v_critical then '💥 ¡CRÍTICO!' else '⚔️' end,
          v_attacker_char.name, v_damage, v_defender_char.name);
        if v_start_turn_message is not null then v_message := v_start_turn_message || ' ' || v_message; end if;
      elsif v_total_healing > 0 then
        v_message := format('💚 %s recupera %s de vida.', v_attacker_char.name, v_total_healing);
        if v_start_turn_message is not null then v_message := v_start_turn_message || ' ' || v_message; end if;
      elsif v_message is null then
        v_message := format('✨ %s usa %s.', v_attacker_char.name, v_action_name);
        if v_start_turn_message is not null then v_message := v_start_turn_message || ' ' || v_message; end if;
      end if;
    end if;
  end if;

  -- Status durations tick on the acting player's turn. Newly applied states do not
  -- lose a turn immediately, and states on the opponent remain until their turn.
  select coalesce(jsonb_agg(
    case
      when s->>'type' = any(v_applied_state_types) then s
      else jsonb_set(s, '{turns}', to_jsonb(coalesce((s->>'turns')::integer, 1) - 1), true)
    end
  ), '[]'::jsonb)
  into v_next_states
  from jsonb_array_elements(v_attacker_states) s
  where s->>'type' = any(v_applied_state_types)
    or coalesce((s->>'turns')::integer, 1) - 1 > 0;
  v_attacker_states := v_next_states;

  v_attacker := jsonb_set(v_attacker, '{hp}', to_jsonb(greatest(0, v_hp)), true);
  v_attacker := jsonb_set(v_attacker, '{states}', v_attacker_states, true);
  v_attacker := jsonb_set(v_attacker, '{energy}', to_jsonb(v_new_energy), true);
  v_defender := jsonb_set(v_defender, '{hp}', to_jsonb(greatest(0, v_def_hp)), true);
  v_defender := jsonb_set(v_defender, '{states}', v_defender_states, true);
  v_defender := jsonb_set(v_defender, '{energy}', to_jsonb(v_def_energy), true);

  v_round := coalesce((v_state->>'round')::integer, 1) + 1;
  v_state := jsonb_set(v_state, '{players}', jsonb_set(
    jsonb_set(v_players, array[v_attacker_id::text], v_attacker, true),
    array[v_defender_id::text], v_defender, true
  ), true);
  v_log := coalesce(v_state->'log', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'id', pg_catalog.gen_random_uuid(),
    'user_id', v_attacker_id,
    'action', p_action,
    'action_name', v_action_name,
    'type', v_type,
    'message', v_message,
    'damage', v_damage,
    'critical', v_critical
  ));
  v_state := jsonb_set(v_state, '{round}', to_jsonb(v_round), true);
  v_state := jsonb_set(v_state, '{log}', v_log, true);

  if v_def_hp <= 0 then
    v_winner_id := v_attacker_id;
    v_state := jsonb_set(v_state, '{winner_user_id}', to_jsonb(v_winner_id), true);
    v_state := jsonb_set(v_state, '{status}', to_jsonb('finished'::text), true);
    update public.battle_rooms set battle_state = v_state, status = 'finished' where id = p_room_id;
  else
    v_state := jsonb_set(v_state, '{turn_user_id}', to_jsonb(v_defender_id), true);
    update public.battle_rooms set battle_state = v_state where id = p_room_id;
  end if;

  return v_state;
end;
$function$;

revoke execute on function public.process_online_battle_action(uuid, text, integer) from public, anon;
grant execute on function public.process_online_battle_action(uuid, text, integer) to authenticated;
