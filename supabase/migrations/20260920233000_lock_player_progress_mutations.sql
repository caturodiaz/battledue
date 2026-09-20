drop policy if exists "Users can insert their own progress" on public.player_progress;
drop policy if exists "Users can update their own progress" on public.player_progress;

comment on table public.player_progress is 'Progression is mutated only by SECURITY DEFINER battle reward functions; clients may read their own progression.';
