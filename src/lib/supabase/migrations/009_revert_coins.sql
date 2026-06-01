-- Fix revert_match_score: also reverse coins earned from the match
CREATE OR REPLACE FUNCTION public.revert_match_score(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match  matches%rowtype;
  v_pred   predictions%rowtype;
  v_tx     coin_transactions%rowtype;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- 1. Reverse coin transactions earned from this match
  FOR v_tx IN
    SELECT * FROM public.coin_transactions
    WHERE match_id = p_match_id AND type = 'earn'
  LOOP
    UPDATE public.prono_members
    SET coins_in_prono = GREATEST(0, coins_in_prono - v_tx.amount)
    WHERE user_id = v_tx.user_id AND prono_id = v_tx.prono_id;
  END LOOP;
  DELETE FROM public.coin_transactions WHERE match_id = p_match_id AND type = 'earn';

  -- 2. Clear points from predictions and recalculate prono totals
  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id AND points_earned IS NOT NULL
  LOOP
    UPDATE public.predictions SET points_earned = NULL WHERE id = v_pred.id;

    UPDATE public.prono_members
    SET total_points = (
      SELECT COALESCE(SUM(p.points_earned), 0)
      FROM public.predictions p
      WHERE p.user_id = v_pred.user_id
        AND p.prono_id = v_pred.prono_id
        AND p.points_earned IS NOT NULL
    )
    WHERE user_id = v_pred.user_id AND prono_id = v_pred.prono_id;
  END LOOP;

  -- 3. Reset match status
  UPDATE public.matches
  SET status = 'upcoming', home_score = NULL, away_score = NULL
  WHERE id = p_match_id;
END;
$$;
