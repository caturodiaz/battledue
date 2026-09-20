-- Fix process_online_battle_action for the actual schema:
-- characters.id and battle_participants.character_id are TEXT, not UUID.

do $$
declare
  fn text;
begin
  select pg_get_functiondef(p.oid)
    into fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'process_online_battle_action'
    and pg_get_function_identity_arguments(p.oid) = 'p_room_id uuid, p_action text, p_ability_index integer';

  if fn is null then
    raise exception 'No se encontró public.process_online_battle_action(uuid,text,integer)';
  end if;

  fn := replace(
    fn,
    'from public.characters where id = (v_players->v_attacker_id::text->>''character_id'')::uuid;',
    'from public.characters where id = (v_players->v_attacker_id::text->>''character_id'');'
  );

  fn := replace(
    fn,
    'from public.characters where id = (v_players->v_defender_id::text->>''character_id'')::uuid;',
    'from public.characters where id = (v_players->v_defender_id::text->>''character_id'');'
  );

  execute fn;
end $$;
