-- Fix: predictions were only visible to others when status = 'finished'.
-- Now also visible once now() >= match_date (match has kicked off),
-- even if the admin hasn't scored it yet.

DROP POLICY IF EXISTS "predictions_own_read" ON public.predictions;

CREATE POLICY "predictions_own_read" ON public.predictions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id
        AND (status IN ('live', 'finished') OR now() >= match_date)
    )
    OR EXISTS (
      SELECT 1 FROM public.power_up_uses pu
      WHERE pu.user_id = auth.uid()
        AND pu.match_id = predictions.match_id
        AND pu.type = 'spy'
        AND pu.target_user_id = predictions.user_id
    )
  );
