-- Fix revert_match_score: reverse coins earned from the match.
-- Rewrite avoids nested FOR loops that cause syntax issues in some Supabase versions.

CREATE OR REPLACE FUNCTION public.revert_match_score(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1. Reverse coins earned from this match (batch update, no loop)
  UPDATE public.prono_members pm
  SET coins_in_prono = GREATEST(0, pm.coins_in_prono - ct.total)
  FROM (
    SELECT user_id, prono_id, SUM(amount) AS total
    FROM public.coin_transactions
    WHERE match_id = p_match_id AND type = 'earn'
    GROUP BY user_id, prono_id
  ) ct
  WHERE pm.user_id = ct.user_id AND pm.prono_id = ct.prono_id;

  DELETE FROM public.coin_transactions
  WHERE match_id = p_match_id AND type = 'earn';

  -- 2. Clear points from predictions
  UPDATE public.predictions
  SET points_earned = NULL
  WHERE match_id = p_match_id AND points_earned IS NOT NULL;

  -- 3. Recalculate total_points for all affected prono members
  UPDATE public.prono_members pm
  SET total_points = (
    SELECT COALESCE(SUM(p.points_earned), 0)
    FROM public.predictions p
    WHERE p.user_id = pm.user_id
      AND p.prono_id = pm.prono_id
      AND p.points_earned IS NOT NULL
  )
  WHERE EXISTS (
    SELECT 1 FROM public.predictions p
    WHERE p.match_id = p_match_id
      AND p.user_id = pm.user_id
      AND p.prono_id = pm.prono_id
  );

  -- 4. Reset match status
  UPDATE public.matches
  SET status = 'upcoming', home_score = NULL, away_score = NULL
  WHERE id = p_match_id;
END;
$$;
