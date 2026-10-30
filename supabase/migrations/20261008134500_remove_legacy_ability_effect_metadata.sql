-- Remove legacy ability effect metadata after declarative migration.
-- Runtime now consumes ability.effects / ability.combat directly.

update public.characters
set profile =
  (
    profile
    - 'ultimateBattleEffect'
  )
  || jsonb_build_object(
    'abilities',
    (
      select coalesce(
        jsonb_agg(ability - 'battleEffect' order by ord),
        '[]'::jsonb
      )
      from jsonb_array_elements(coalesce(profile->'abilities', '[]'::jsonb))
        with ordinality as items(ability, ord)
    )
  )
where profile ? 'ultimateBattleEffect'
   or exists (
     select 1
     from jsonb_array_elements(coalesce(profile->'abilities', '[]'::jsonb)) ability
     where ability ? 'battleEffect'
   );
