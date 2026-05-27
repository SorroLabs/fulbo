-- Migration 002: configurable points per prono
-- Run this in the Supabase SQL editor.

-- 1. Add points_exact and points_result to pronos
ALTER TABLE public.pronos
  ADD COLUMN IF NOT EXISTS points_exact INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS points_result INTEGER NOT NULL DEFAULT 1;

-- 2. Replace score_match with per-prono scoring
--    - predictions.points_earned keeps standard phase-based values (used for coins)
--    - prono_members.total_points is recalculated using each prono's own values
--    - power-ups (double_points, wildcard) are now correctly scoped per prono
CREATE OR REPLACE FUNCTION public.score_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match      matches%rowtype;
  v_pred       predictions%rowtype;
  v_base_pts   integer;
  v_outcome    text; -- 'exact', 'result', 'wrong'
  v_coin_amt   integer;
  v_pm         record;
  v_prono_pts  integer;
  v_has_double boolean;
  v_has_wild   boolean;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id AND status = 'finished';
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id AND points_earned IS NULL
  LOOP
    -- Determine outcome type
    IF v_pred.home_score = v_match.home_score AND v_pred.away_score = v_match.away_score THEN
      v_outcome := 'exact';
    ELSIF
      (CASE WHEN v_pred.home_score > v_pred.away_score THEN 'home'
            WHEN v_pred.home_score < v_pred.away_score THEN 'away'
            ELSE 'draw' END)
      =
      (CASE WHEN v_match.home_score > v_match.away_score THEN 'home'
            WHEN v_match.home_score < v_match.away_score THEN 'away'
            ELSE 'draw' END)
    THEN
      v_outcome := 'result';
    ELSE
      v_outcome := 'wrong';
    END IF;

    -- Standard phase-based points stored in predictions (used for coins only)
    v_base_pts := public.calculate_prediction_points(
      v_pred.home_score, v_pred.away_score,
      v_match.home_score, v_match.away_score,
      v_match.phase
    );
    UPDATE public.predictions SET points_earned = v_base_pts WHERE id = v_pred.id;

    -- Coin amount: always uses standard 3/1 values regardless of prono config
    v_coin_amt := CASE v_outcome WHEN 'exact' THEN 3 WHEN 'result' THEN 1 ELSE 0 END;

    -- Per-prono: coins + total_points
    FOR v_pm IN
      SELECT pm.id AS pm_id, pm.prono_id, po.points_exact, po.points_result, po.competition_id
      FROM public.prono_members pm
      JOIN public.pronos po ON po.id = pm.prono_id
      WHERE pm.user_id = v_pred.user_id
        AND po.competition_id = v_pred.competition_id
    LOOP
      -- Credit coins (once per prono)
      IF v_coin_amt > 0 THEN
        UPDATE public.prono_members
          SET coins_in_prono = coins_in_prono + v_coin_amt
          WHERE id = v_pm.pm_id;

        INSERT INTO public.coin_transactions
          (user_id, amount, type, reason, competition_id, match_id, prono_id)
        VALUES (
          v_pred.user_id, v_coin_amt, 'earn',
          CASE v_outcome WHEN 'exact' THEN 'Marcador exacto' ELSE 'Resultado correcto' END,
          v_pred.competition_id, p_match_id, v_pm.prono_id
        );
      END IF;

      -- Check power-ups scoped to this prono
      SELECT EXISTS(
        SELECT 1 FROM public.power_up_uses
        WHERE user_id = v_pred.user_id AND match_id = p_match_id
          AND type = 'double_points' AND prono_id = v_pm.prono_id
      ) INTO v_has_double;

      SELECT EXISTS(
        SELECT 1 FROM public.power_up_uses
        WHERE user_id = v_pred.user_id AND match_id = p_match_id
          AND type = 'wildcard' AND prono_id = v_pm.prono_id
      ) INTO v_has_wild;

      -- Prono-specific points
      IF v_outcome = 'exact' THEN
        v_prono_pts := v_pm.points_exact;
      ELSIF v_outcome = 'result' THEN
        v_prono_pts := v_pm.points_result;
      ELSIF v_has_wild THEN
        v_prono_pts := v_pm.points_result; -- wildcard gives result points on a miss
      ELSE
        v_prono_pts := 0;
      END IF;

      IF v_has_double AND v_prono_pts > 0 THEN
        v_prono_pts := v_prono_pts * 2;
      END IF;

      -- Recalculate total_points from scratch for this prono to avoid drift
      UPDATE public.prono_members
      SET total_points = (
        SELECT COALESCE(SUM(
          CASE
            WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN
              CASE WHEN pu_d.id IS NOT NULL THEN v_pm.points_exact * 2 ELSE v_pm.points_exact END
            WHEN (CASE WHEN p.home_score > p.away_score THEN 'home'
                       WHEN p.home_score < p.away_score THEN 'away' ELSE 'draw' END)
               = (CASE WHEN m.home_score > m.away_score THEN 'home'
                       WHEN m.home_score < m.away_score THEN 'away' ELSE 'draw' END)
            THEN
              CASE WHEN pu_d.id IS NOT NULL THEN v_pm.points_result * 2 ELSE v_pm.points_result END
            WHEN pu_w.id IS NOT NULL THEN
              v_pm.points_result
            ELSE 0
          END
        ), 0)
        FROM public.predictions p
        JOIN public.matches m ON m.id = p.match_id
        LEFT JOIN public.power_up_uses pu_d
          ON pu_d.user_id = p.user_id AND pu_d.match_id = p.match_id
         AND pu_d.type = 'double_points' AND pu_d.prono_id = v_pm.prono_id
        LEFT JOIN public.power_up_uses pu_w
          ON pu_w.user_id = p.user_id AND pu_w.match_id = p.match_id
         AND pu_w.type = 'wildcard' AND pu_w.prono_id = v_pm.prono_id
        WHERE p.user_id = v_pred.user_id
          AND p.competition_id = v_pred.competition_id
          AND p.points_earned IS NOT NULL
      )
      WHERE id = v_pm.pm_id;
    END LOOP;
  END LOOP;
END;
$$;

-- 3. Update revert_match_score to recalculate per-prono total_points
CREATE OR REPLACE FUNCTION public.revert_match_score(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match matches%rowtype;
  v_pred  predictions%rowtype;
  v_pm    record;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.matches
    SET status = 'upcoming', home_score = NULL, away_score = NULL
    WHERE id = p_match_id;

  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id AND points_earned IS NOT NULL
  LOOP
    UPDATE public.predictions SET points_earned = NULL WHERE id = v_pred.id;

    DELETE FROM public.coin_transactions
      WHERE match_id = p_match_id AND user_id = v_pred.user_id;

    FOR v_pm IN
      SELECT pm.id AS pm_id, pm.prono_id, po.points_exact, po.points_result
      FROM public.prono_members pm
      JOIN public.pronos po ON po.id = pm.prono_id
      WHERE pm.user_id = v_pred.user_id
        AND po.competition_id = v_pred.competition_id
    LOOP
      -- Recalculate coins from remaining transactions
      UPDATE public.prono_members
      SET coins_in_prono = 100 + COALESCE((
        SELECT SUM(CASE WHEN ct.type IN ('earn', 'admin_grant') THEN ct.amount ELSE -ct.amount END)
        FROM public.coin_transactions ct
        WHERE ct.user_id = v_pred.user_id AND ct.prono_id = v_pm.prono_id
      ), 0)
      WHERE id = v_pm.pm_id;

      -- Recalculate total_points using prono-specific values
      UPDATE public.prono_members
      SET total_points = (
        SELECT COALESCE(SUM(
          CASE
            WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN
              CASE WHEN pu_d.id IS NOT NULL THEN v_pm.points_exact * 2 ELSE v_pm.points_exact END
            WHEN (CASE WHEN p.home_score > p.away_score THEN 'home'
                       WHEN p.home_score < p.away_score THEN 'away' ELSE 'draw' END)
               = (CASE WHEN m.home_score > m.away_score THEN 'home'
                       WHEN m.home_score < m.away_score THEN 'away' ELSE 'draw' END)
            THEN
              CASE WHEN pu_d.id IS NOT NULL THEN v_pm.points_result * 2 ELSE v_pm.points_result END
            WHEN pu_w.id IS NOT NULL THEN v_pm.points_result
            ELSE 0
          END
        ), 0)
        FROM public.predictions p
        JOIN public.matches m ON m.id = p.match_id
        LEFT JOIN public.power_up_uses pu_d
          ON pu_d.user_id = p.user_id AND pu_d.match_id = p.match_id
         AND pu_d.type = 'double_points' AND pu_d.prono_id = v_pm.prono_id
        LEFT JOIN public.power_up_uses pu_w
          ON pu_w.user_id = p.user_id AND pu_w.match_id = p.match_id
         AND pu_w.type = 'wildcard' AND pu_w.prono_id = v_pm.prono_id
        WHERE p.user_id = v_pred.user_id
          AND p.competition_id = v_pred.competition_id
          AND p.points_earned IS NOT NULL
      )
      WHERE id = v_pm.pm_id;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.score_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_match_score(uuid) TO authenticated;
