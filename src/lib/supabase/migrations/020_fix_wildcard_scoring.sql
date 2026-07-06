-- Fix wildcard scoring bug: was only firing when total pts = 0.
-- Correct behavior: if result was wrong, wildcard guarantees minimum
-- resultado points (5 × phase multiplier), regardless of exact score bonuses.
-- Also backfills all historical predictions affected by this bug.

-- 1. Fix score_match function
CREATE OR REPLACE FUNCTION public.score_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match          matches%rowtype;
  v_pred           predictions%rowtype;
  v_pts            integer;
  v_double         boolean;
  v_wildcard       boolean;
  v_result_correct boolean;
  v_coin_amount    integer;
  v_pm             record;
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

    -- wildcard: if result wrong, guarantee minimum resultado points (5 × phase multiplier)
    v_result_correct := (
      (v_pred.home_score > v_pred.away_score AND v_match.home_score > v_match.away_score) OR
      (v_pred.home_score < v_pred.away_score AND v_match.home_score < v_match.away_score) OR
      (v_pred.home_score = v_pred.away_score AND v_match.home_score = v_match.away_score)
    );
    IF NOT v_result_correct THEN
      SELECT EXISTS(
        SELECT 1 FROM public.power_up_uses
        WHERE user_id = v_pred.user_id AND match_id = p_match_id AND type = 'wildcard'
      ) INTO v_wildcard;
      IF v_wildcard THEN
        v_pts := GREATEST(v_pts, 5 * CASE WHEN v_match.phase = 'groups' THEN 1 ELSE 2 END);
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

-- 2. Backfill: fix all historical predictions under-scored due to this bug
DO $$
DECLARE
  r        RECORD;
  v_result_correct boolean;
  v_min_pts        integer;
  v_delta          integer;
BEGIN
  FOR r IN
    SELECT
      p.id,
      p.user_id,
      p.prono_id,
      p.home_score  AS pred_home,
      p.away_score  AS pred_away,
      m.home_score  AS real_home,
      m.away_score  AS real_away,
      m.phase,
      p.points_earned
    FROM public.predictions p
    JOIN public.matches m ON m.id = p.match_id
    WHERE m.status = 'finished'
      AND p.points_earned IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.power_up_uses pu
        WHERE pu.user_id = p.user_id
          AND pu.match_id = p.match_id
          AND pu.prono_id = p.prono_id
          AND pu.type = 'wildcard'
      )
  LOOP
    v_result_correct := (
      (r.pred_home > r.pred_away AND r.real_home > r.real_away) OR
      (r.pred_home < r.pred_away AND r.real_home < r.real_away) OR
      (r.pred_home = r.pred_away AND r.real_home = r.real_away)
    );

    IF v_result_correct THEN CONTINUE; END IF;

    v_min_pts := 5 * CASE WHEN r.phase = 'groups' THEN 1 ELSE 2 END;

    IF r.points_earned >= v_min_pts THEN CONTINUE; END IF;

    v_delta := v_min_pts - r.points_earned;

    UPDATE public.predictions
    SET points_earned = v_min_pts
    WHERE id = r.id;

    UPDATE public.prono_members
    SET total_points = total_points + v_delta
    WHERE user_id = r.user_id AND prono_id = r.prono_id;

    RAISE NOTICE 'Fixed prediction % — user % prono % +% pts', r.id, r.user_id, r.prono_id, v_delta;
  END LOOP;
END $$;
