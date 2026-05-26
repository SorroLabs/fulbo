-- 001_power_up_wallets.sql
-- Per-prono coin wallets + power-up infrastructure

-- 1. Add power_ups_enabled to pronos (already in TS types)
ALTER TABLE public.pronos
  ADD COLUMN IF NOT EXISTS power_ups_enabled boolean NOT NULL DEFAULT true;

-- 2. Change coins_in_prono default from 0 to 100
ALTER TABLE public.prono_members
  ALTER COLUMN coins_in_prono SET DEFAULT 100;

-- Set existing members to 100 if they have 0 (initial grant)
UPDATE public.prono_members SET coins_in_prono = 100 WHERE coins_in_prono = 0;

-- 3. Add prono_id to power_up_uses + update unique constraint
ALTER TABLE public.power_up_uses
  ADD COLUMN IF NOT EXISTS prono_id uuid REFERENCES public.pronos(id) ON DELETE CASCADE;

ALTER TABLE public.power_up_uses
  DROP CONSTRAINT IF EXISTS power_up_uses_user_id_match_id_type_key;

ALTER TABLE public.power_up_uses
  ADD CONSTRAINT power_up_uses_user_prono_match_type_unique
  UNIQUE(user_id, prono_id, match_id, type);

-- 4. Create prono_powerup_config table
CREATE TABLE IF NOT EXISTS public.prono_powerup_config (
  prono_id uuid NOT NULL REFERENCES public.pronos(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('late_change', 'double_points', 'spy', 'wildcard')),
  cost integer NOT NULL CHECK (cost >= 0),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (prono_id, type)
);

ALTER TABLE public.prono_powerup_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "powerup_config_member_read" ON public.prono_powerup_config;
CREATE POLICY "powerup_config_member_read" ON public.prono_powerup_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.prono_members
      WHERE prono_id = prono_powerup_config.prono_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "powerup_config_owner_write" ON public.prono_powerup_config;
CREATE POLICY "powerup_config_owner_write" ON public.prono_powerup_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pronos
      WHERE id = prono_powerup_config.prono_id AND owner_id = auth.uid()
    )
  );

-- 5. Add prono_id to coin_transactions
ALTER TABLE public.coin_transactions
  ADD COLUMN IF NOT EXISTS prono_id uuid REFERENCES public.pronos(id) ON DELETE SET NULL;

-- 6. Update power_up_uses RLS: members can see power-ups after match starts
DROP POLICY IF EXISTS "powerups_own" ON public.power_up_uses;

CREATE POLICY "powerups_own_write" ON public.power_up_uses
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "powerups_prono_read_after_lock" ON public.power_up_uses;
CREATE POLICY "powerups_prono_read_after_lock" ON public.power_up_uses
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM public.prono_members
        WHERE prono_id = power_up_uses.prono_id AND user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = power_up_uses.match_id AND status != 'upcoming'
      )
    )
  );

-- 7. Allow spy access to target's prediction before match ends
DROP POLICY IF EXISTS "predictions_own_read" ON public.predictions;

CREATE POLICY "predictions_own_read" ON public.predictions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches WHERE id = match_id AND status = 'finished'
    )
    OR EXISTS (
      SELECT 1 FROM public.power_up_uses pu
      WHERE pu.user_id = auth.uid()
        AND pu.match_id = predictions.match_id
        AND pu.type = 'spy'
        AND pu.target_user_id = predictions.user_id
    )
  );

-- 8. Update score_match: credit coins_in_prono per prono (not profiles.coins)
CREATE OR REPLACE FUNCTION public.score_match(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match matches%rowtype;
  v_pred predictions%rowtype;
  v_pts integer;
  v_double boolean;
  v_wildcard boolean;
  v_coin_amount integer;
  v_pm record;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id AND status = 'finished';
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id AND points_earned IS NULL LOOP
    v_pts := public.calculate_prediction_points(
      v_pred.home_score, v_pred.away_score,
      v_match.home_score, v_match.away_score,
      v_match.phase
    );

    -- double_points power-up (competition-wide effect)
    SELECT EXISTS(
      SELECT 1 FROM public.power_up_uses
      WHERE user_id = v_pred.user_id AND match_id = p_match_id AND type = 'double_points'
    ) INTO v_double;

    IF v_double AND v_pts > 0 THEN v_pts := v_pts * 2; END IF;

    -- wildcard: if 0 pts, give result points
    IF v_pts = 0 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.power_up_uses
        WHERE user_id = v_pred.user_id AND match_id = p_match_id AND type = 'wildcard'
      ) INTO v_wildcard;

      IF v_wildcard THEN
        CASE v_match.phase
          WHEN 'groups' THEN v_pts := 1;
          WHEN 'final', 'semifinals' THEN v_pts := 3;
          ELSE v_pts := 2;
        END CASE;
      END IF;
    END IF;

    UPDATE public.predictions SET points_earned = v_pts WHERE id = v_pred.id;

    -- Determine coin reward
    v_coin_amount := 0;
    IF v_pts > 0 THEN
      IF v_pred.home_score = v_match.home_score AND v_pred.away_score = v_match.away_score THEN
        v_coin_amount := 3;
      ELSE
        v_coin_amount := 1;
      END IF;
    END IF;

    -- Credit coins_in_prono for every prono the user is in for this competition
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

        INSERT INTO public.coin_transactions (user_id, amount, type, reason, competition_id, match_id, prono_id)
        VALUES (
          v_pred.user_id,
          v_coin_amount,
          'earn',
          CASE WHEN v_coin_amount = 3 THEN 'Marcador exacto' ELSE 'Resultado correcto' END,
          v_pred.competition_id,
          p_match_id,
          v_pm.prono_id
        );
      END LOOP;
    END IF;

    -- Update total_points in all prono_members for this competition
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

-- 9. Create revert_match_score RPC
CREATE OR REPLACE FUNCTION public.revert_match_score(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match matches%rowtype;
  v_pred predictions%rowtype;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Reset match
  UPDATE public.matches
  SET status = 'upcoming', home_score = NULL, away_score = NULL
  WHERE id = p_match_id;

  FOR v_pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id AND points_earned IS NOT NULL LOOP
    UPDATE public.predictions SET points_earned = NULL WHERE id = v_pred.id;

    -- Remove coin transactions for this match/user
    DELETE FROM public.coin_transactions
    WHERE match_id = p_match_id AND user_id = v_pred.user_id;

    -- Recalculate coins_in_prono from remaining transactions (base: 100 initial grant)
    UPDATE public.prono_members pm
    SET coins_in_prono = 100 + COALESCE((
      SELECT SUM(CASE WHEN ct.type IN ('earn', 'admin_grant') THEN ct.amount ELSE -ct.amount END)
      FROM public.coin_transactions ct
      WHERE ct.user_id = v_pred.user_id
        AND ct.prono_id = pm.prono_id
    ), 0)
    WHERE pm.user_id = v_pred.user_id
      AND EXISTS (
        SELECT 1 FROM public.pronos po
        WHERE po.id = pm.prono_id AND po.competition_id = v_pred.competition_id
      );

    -- Recalculate total_points
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

-- Grant execute on new functions to authenticated role
GRANT EXECUTE ON FUNCTION public.revert_match_score(uuid) TO authenticated;
