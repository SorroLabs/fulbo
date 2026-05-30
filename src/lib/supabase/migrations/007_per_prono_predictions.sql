-- Per-prono predictions: each prono has independent predictions per user
-- A user can predict differently in each prono for the same match.

ALTER TABLE public.predictions
  ADD COLUMN prono_id uuid REFERENCES public.pronos ON DELETE CASCADE;

-- Drop old unique constraint (one prediction per user per match)
ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;

-- New constraint: one prediction per user per match per prono
ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_user_prono_match_unique
  UNIQUE (user_id, prono_id, match_id);

-- Clean up predictions without prono_id (test data)
DELETE FROM public.predictions WHERE prono_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE public.predictions
  ALTER COLUMN prono_id SET NOT NULL;

-- Update score_match: score per-prono predictions independently
CREATE OR REPLACE FUNCTION public.score_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match    matches%rowtype;
  v_pred     predictions%rowtype;
  v_pts      integer;
  v_double   boolean;
  v_wildcard boolean;
  v_coin_amt integer;
  v_pm_id    uuid;
  v_coins    integer;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id AND status = 'finished';
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id AND points_earned IS NULL
  LOOP
    v_pts := public.calculate_prediction_points(
      v_pred.home_score, v_pred.away_score,
      v_match.home_score, v_match.away_score,
      v_match.phase
    );

    -- double_points power-up (scoped to this prono)
    SELECT EXISTS(
      SELECT 1 FROM public.power_up_uses
      WHERE user_id = v_pred.user_id
        AND match_id = p_match_id
        AND prono_id = v_pred.prono_id
        AND type = 'double_points'
    ) INTO v_double;
    IF v_double AND v_pts > 0 THEN v_pts := v_pts * 2; END IF;

    -- wildcard: if 0 pts, grant resultado base (scoped to this prono)
    IF v_pts = 0 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.power_up_uses
        WHERE user_id = v_pred.user_id
          AND match_id = p_match_id
          AND prono_id = v_pred.prono_id
          AND type = 'wildcard'
      ) INTO v_wildcard;
      IF v_wildcard THEN
        v_pts := 5 * CASE WHEN v_match.phase = 'groups' THEN 1 ELSE 2 END;
      END IF;
    END IF;

    UPDATE public.predictions SET points_earned = v_pts WHERE id = v_pred.id;

    -- Update this prono member's total_points (only this prono's predictions)
    UPDATE public.prono_members
    SET total_points = (
      SELECT COALESCE(SUM(p.points_earned), 0)
      FROM public.predictions p
      WHERE p.user_id = v_pred.user_id
        AND p.prono_id = v_pred.prono_id
        AND p.points_earned IS NOT NULL
    )
    WHERE user_id = v_pred.user_id AND prono_id = v_pred.prono_id;

    -- Coins: independent from points, standard 3/1, credited to this prono wallet
    v_coin_amt := 0;
    IF v_pred.home_score = v_match.home_score AND v_pred.away_score = v_match.away_score THEN
      v_coin_amt := 3;
    ELSIF (v_pred.home_score > v_pred.away_score AND v_match.home_score > v_match.away_score) OR
          (v_pred.home_score < v_pred.away_score AND v_match.home_score < v_match.away_score) OR
          (v_pred.home_score = v_pred.away_score AND v_match.home_score = v_match.away_score) THEN
      v_coin_amt := 1;
    END IF;

    IF v_coin_amt > 0 THEN
      SELECT id, coins_in_prono INTO v_pm_id, v_coins
      FROM public.prono_members
      WHERE user_id = v_pred.user_id AND prono_id = v_pred.prono_id;

      IF v_pm_id IS NOT NULL THEN
        UPDATE public.prono_members
        SET coins_in_prono = coins_in_prono + v_coin_amt
        WHERE id = v_pm_id;

        INSERT INTO public.coin_transactions
          (user_id, amount, type, reason, competition_id, match_id, prono_id)
        VALUES (
          v_pred.user_id, v_coin_amt, 'earn',
          CASE WHEN v_coin_amt = 3 THEN 'Marcador exacto' ELSE 'Resultado correcto' END,
          v_match.competition_id, p_match_id, v_pred.prono_id
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Global leaderboard: best points per match per user across all their pronos
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  p_competition_id uuid, p_limit integer DEFAULT 50
) RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text,
  total_points bigint, exact_predictions bigint,
  correct_predictions bigint, wrong_predictions bigint, rank bigint
) LANGUAGE sql AS $$
  SELECT
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(best.pts), 0) AS total_points,
    COUNT(*) FILTER (WHERE best.is_exact) AS exact_predictions,
    COUNT(*) FILTER (WHERE best.pts > 0 AND NOT best.is_exact) AS correct_predictions,
    COUNT(*) FILTER (WHERE best.pts = 0) AS wrong_predictions,
    RANK() OVER (ORDER BY COALESCE(SUM(best.pts), 0) DESC) AS rank
  FROM public.profiles p
  INNER JOIN (
    SELECT
      pr.user_id,
      pr.match_id,
      MAX(pr.points_earned) AS pts,
      BOOL_OR(pr.home_score = m.home_score AND pr.away_score = m.away_score) AS is_exact
    FROM public.predictions pr
    INNER JOIN public.matches m ON m.id = pr.match_id
    WHERE m.competition_id = p_competition_id
      AND pr.points_earned IS NOT NULL
    GROUP BY pr.user_id, pr.match_id
  ) best ON best.user_id = p.id
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY total_points DESC
  LIMIT p_limit;
$$;

-- Update revert_match_score to handle per-prono predictions
CREATE OR REPLACE FUNCTION public.revert_match_score(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match  matches%rowtype;
  v_pred   predictions%rowtype;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id AND points_earned IS NOT NULL
  LOOP
    UPDATE public.predictions SET points_earned = NULL WHERE id = v_pred.id;

    -- Recalculate this prono member's total_points
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

  -- Revert match status
  UPDATE public.matches
  SET status = 'upcoming', home_score = NULL, away_score = NULL
  WHERE id = p_match_id;
END;
$$;
