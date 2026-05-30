-- GolPredictor-style scoring system
-- Components: resultado (5) + goles local (2) + goles visitante (2) + diferencia (1) = max 10
-- Multiplier: groups = 1x, all other phases = 2x (max 20)
-- Coins remain separate and unchanged: exact = 3, result = 1

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

CREATE OR REPLACE FUNCTION public.score_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match  matches%rowtype;
  v_pred   predictions%rowtype;
  v_pts    integer;
  v_double boolean;
  v_wildcard boolean;
  v_coin_amount integer;
  v_pm     record;
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

    -- double_points power-up
    SELECT EXISTS(
      SELECT 1 FROM public.power_up_uses
      WHERE user_id = v_pred.user_id AND match_id = p_match_id AND type = 'double_points'
    ) INTO v_double;
    IF v_double AND v_pts > 0 THEN v_pts := v_pts * 2; END IF;

    -- wildcard: if 0 pts, grant resultado base (5 × multiplier)
    IF v_pts = 0 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.power_up_uses
        WHERE user_id = v_pred.user_id AND match_id = p_match_id AND type = 'wildcard'
      ) INTO v_wildcard;
      IF v_wildcard THEN
        v_pts := 5 * CASE WHEN v_match.phase = 'groups' THEN 1 ELSE 2 END;
      END IF;
    END IF;

    UPDATE public.predictions SET points_earned = v_pts WHERE id = v_pred.id;

    -- Coins: independent from points, standard 3/1
    v_coin_amount := 0;
    IF v_pred.home_score = v_match.home_score AND v_pred.away_score = v_match.away_score THEN
      v_coin_amount := 3;
    ELSIF (v_pred.home_score > v_pred.away_score AND v_match.home_score > v_match.away_score) OR
          (v_pred.home_score < v_pred.away_score AND v_match.home_score < v_match.away_score) OR
          (v_pred.home_score = v_pred.away_score AND v_match.home_score = v_match.away_score) THEN
      v_coin_amount := 1;
    END IF;

    IF v_coin_amount > 0 THEN
      FOR v_pm IN
        SELECT pm.id AS pm_id, pm.prono_id
        FROM public.prono_members pm
        JOIN public.pronos po ON po.id = pm.prono_id
        WHERE pm.user_id = v_pred.user_id
          AND po.competition_id = v_pred.competition_id
      LOOP
        UPDATE public.prono_members
        SET coins_in_prono = coins_in_prono + v_coin_amount
        WHERE id = v_pm.pm_id;

        INSERT INTO public.coin_transactions
          (user_id, amount, type, reason, competition_id, match_id, prono_id)
        VALUES (
          v_pred.user_id, v_coin_amount, 'earn',
          CASE WHEN v_coin_amount = 3 THEN 'Marcador exacto' ELSE 'Resultado correcto' END,
          v_pred.competition_id, p_match_id, v_pm.prono_id
        );
      END LOOP;
    END IF;

    -- Update prono_members total_points
    UPDATE public.prono_members pm
    SET total_points = (
      SELECT COALESCE(SUM(p.points_earned), 0)
      FROM public.predictions p
      WHERE p.user_id = v_pred.user_id
        AND p.competition_id = v_pred.competition_id
        AND p.points_earned IS NOT NULL
    )
    WHERE pm.user_id = v_pred.user_id
      AND EXISTS (
        SELECT 1 FROM public.pronos po
        WHERE po.id = pm.prono_id AND po.competition_id = v_pred.competition_id
      );
  END LOOP;
END;
$$;

-- Update leaderboard: use score comparison instead of point-based filtering
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
    COALESCE(SUM(pr.points_earned), 0) AS total_points,
    COUNT(*) FILTER (
      WHERE pr.home_score = m.home_score AND pr.away_score = m.away_score
    ) AS exact_predictions,
    COUNT(*) FILTER (
      WHERE pr.points_earned > 0
        AND NOT (pr.home_score = m.home_score AND pr.away_score = m.away_score)
    ) AS correct_predictions,
    COUNT(*) FILTER (WHERE pr.points_earned = 0) AS wrong_predictions,
    RANK() OVER (ORDER BY COALESCE(SUM(pr.points_earned), 0) DESC) AS rank
  FROM public.profiles p
  INNER JOIN public.predictions pr
    ON pr.user_id = p.id AND pr.competition_id = p_competition_id
  INNER JOIN public.matches m ON m.id = pr.match_id
  WHERE pr.points_earned IS NOT NULL
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY total_points DESC
  LIMIT p_limit;
$$;
