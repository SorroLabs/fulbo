-- Store official special prediction answers on the competition itself
-- so the competition page can display them publicly once the admin scores them.
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS official_answers jsonb DEFAULT '{}'::jsonb;
