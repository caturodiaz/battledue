-- Completes the declarative migration for normal abilities.
-- Abilities without explicit effects historically behaved as generic damaging
-- abilities with the same indexed multiplier defaults. Preserve that behavior
-- as data so the runtime no longer needs a legacy fallback.
-- Tokata's Metamorfosis remains a UI-owned special action.

UPDATE public.characters AS c
SET profile = jsonb_set(
  c.profile,
  '{abilities}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN a ? 'effects' THEN a
        WHEN lower(COALESCE(a->>'name', '')) = 'metamorfosis' THEN a
        ELSE
          a
          || jsonb_build_object(
            'costs', COALESCE(a->'costs', jsonb_build_object('energy', 25)),
            'combat', COALESCE(a->'combat', jsonb_build_object(
              'multiplier', 1.45 + ((ord - 1) * 0.15),
              'criticalBonus', 5
            )),
            'effects', jsonb_build_array(
              jsonb_build_object(
                'type', 'damage_resolve',
                'multiplier', 1.45 + ((ord - 1) * 0.15)
              )
            )
          )
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
    WHERE NOT (item.a ? 'effects')
      AND lower(COALESCE(item.a->>'name', '')) <> 'metamorfosis'
  );
