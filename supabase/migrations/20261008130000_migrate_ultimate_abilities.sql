-- Migrates ultimate abilities to the declarative combat definition.
-- The legacy ultimateBattleEffect field is intentionally retained for rollback/compatibility.
-- Generic ultimates preserve the engine's existing behavior: 3x damage, guaranteed hit,
-- +15 critical bonus, 100 energy cost. Explicit legacy effects are encoded declaratively.

UPDATE public.characters AS c
SET profile = jsonb_set(
  c.profile,
  '{ultimateAbility}',
  jsonb_build_object(
    'id', 'ultimate',
    'name', COALESCE(c.profile->>'ultimateName', 'Técnica definitiva'),
    'costs', jsonb_build_object('energy', 100),
    'combat', jsonb_build_object(
      'multiplier',
        CASE
          WHEN c.profile->'ultimateBattleEffect'->>'type' = 'full_heal_self' THEN 0
          ELSE 3
        END,
      'guaranteedHit', true,
      'criticalBonus', 15,
      'ultimate', true
    ),
    'effects',
      CASE
        WHEN c.profile->'ultimateBattleEffect'->>'type' = 'full_heal_self' THEN
          jsonb_build_array(
            jsonb_build_object(
              'type', 'heal',
              'target', 'self',
              'percent', 1
            )
          )
        ELSE
          jsonb_build_array(
            jsonb_build_object(
              'type', 'damage_resolve',
              'multiplier', 3
            )
          )
          ||
          CASE c.profile->'ultimateBattleEffect'->>'type'
            WHEN 'bleeding' THEN jsonb_build_array(
              jsonb_build_object(
                'type', 'state_add',
                'state', 'bleeding',
                'target', COALESCE(c.profile->'ultimateBattleEffect'->>'target', 'enemy'),
                'duration', COALESCE((c.profile->'ultimateBattleEffect'->>'turns')::int, 3),
                'stacks', COALESCE((c.profile->'ultimateBattleEffect'->>'stacks')::int, 1)
              )
            )
            ELSE '[]'::jsonb
          END
      END
  ),
  true
)
WHERE c.profile->'ultimateAbility' IS NULL
  AND c.profile ? 'ultimateName';
