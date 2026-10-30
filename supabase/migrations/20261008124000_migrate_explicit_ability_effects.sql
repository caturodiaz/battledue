-- Migrates explicit legacy battle effects to declarative ability definitions.
-- The legacy battleEffect field is intentionally retained for rollback/compatibility.
-- This migration is idempotent because abilities that already define effects are left unchanged.

UPDATE public.characters AS c
SET profile = jsonb_set(
  c.profile,
  '{abilities}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN a ? 'effects' THEN a
        WHEN a ? 'battleEffect'
          AND a->'battleEffect'->>'type' IN ('bleeding', 'stunned', 'heal_self') THEN
          a
          || jsonb_build_object(
            'costs', COALESCE(a->'costs', jsonb_build_object('energy', 25)),
            'combat', COALESCE(a->'combat', jsonb_build_object(
              'multiplier', 1.45 + ((ord - 1) * 0.15),
              'criticalBonus', 5
            )),
            'effects',
              jsonb_build_array(
                jsonb_build_object(
                  'type', 'damage_resolve',
                  'multiplier', 1.45 + ((ord - 1) * 0.15)
                )
              )
              ||
              CASE a->'battleEffect'->>'type'
                WHEN 'bleeding' THEN jsonb_build_array(
                  jsonb_build_object(
                    'type', 'state_add',
                    'state', 'bleeding',
                    'target', COALESCE(a->'battleEffect'->>'target', 'enemy'),
                    'duration', COALESCE((a->'battleEffect'->>'turns')::int, 3),
                    'stacks', COALESCE((a->'battleEffect'->>'stacks')::int, 1)
                  )
                )
                WHEN 'stunned' THEN jsonb_build_array(
                  jsonb_build_object(
                    'type', 'state_add',
                    'state', 'stunned',
                    'target', COALESCE(a->'battleEffect'->>'target', 'enemy'),
                    'duration', COALESCE((a->'battleEffect'->>'turns')::int, 1),
                    'stacks', 1
                  )
                )
                WHEN 'heal_self' THEN jsonb_build_array(
                  jsonb_build_object(
                    'type', 'heal',
                    'target', COALESCE(a->'battleEffect'->>'target', 'self'),
                    'percent', COALESCE((a->'battleEffect'->>'amount')::numeric, 0)
                  )
                )
                ELSE '[]'::jsonb
              END
          )
        ELSE a
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(COALESCE(c.profile->'abilities', '[]'::jsonb))
      WITH ORDINALITY AS items(a, ord)
  ),
  true
)
WHERE jsonb_typeof(c.profile->'abilities') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(c.profile->'abilities', '[]'::jsonb)) AS item(a)
    WHERE item.a ? 'battleEffect'
      AND item.a->'battleEffect'->>'type' IN ('bleeding', 'stunned', 'heal_self')
  );
