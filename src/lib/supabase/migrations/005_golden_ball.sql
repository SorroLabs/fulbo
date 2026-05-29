-- Replace surprise_team with golden_ball in special_predictions
ALTER TABLE public.special_predictions
  DROP CONSTRAINT IF EXISTS special_predictions_type_check;

UPDATE public.special_predictions SET type = 'golden_ball' WHERE type = 'surprise_team';

ALTER TABLE public.special_predictions
  ADD CONSTRAINT special_predictions_type_check
  CHECK (type IN ('champion', 'top_scorer', 'golden_ball'));
