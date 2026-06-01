-- Fix: apply GolPredictor scoring formula (migration 006 was never applied to Supabase).
-- Only replaces calculate_prediction_points — score_match and revert_match_score
-- already have their latest versions (from 007/009) in the database.

DROP FUNCTION IF EXISTS public.calculate_prediction_points(integer, integer, integer, integer, text);

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home integer, pred_away integer,
  real_home integer, real_away integer,
  phase text
) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_pts integer := 0;
  v_multiplier integer;
BEGIN
  v_multiplier := CASE WHEN phase = 'groups' THEN 1 ELSE 2 END;

  -- Resultado correcto (ganador o empate): 5 pts
  IF (pred_home > pred_away AND real_home > real_away) OR
     (pred_home < pred_away AND real_home < real_away) OR
     (pred_home = pred_away AND real_home = real_away) THEN
    v_pts := v_pts + 5;
  END IF;

  -- Goles exactos del local: 2 pts
  IF pred_home = real_home THEN v_pts := v_pts + 2; END IF;

  -- Goles exactos del visitante: 2 pts
  IF pred_away = real_away THEN v_pts := v_pts + 2; END IF;

  -- Diferencia de goles exacta: 1 pt
  IF ABS(pred_home - pred_away) = ABS(real_home - real_away) THEN
    v_pts := v_pts + 1;
  END IF;

  RETURN v_pts * v_multiplier;
END;
$$;
