-- Fix: power-up coin deduction was silently blocked by RLS on prono_members.
-- Move deduction + coin_transaction insert into a SECURITY DEFINER RPC
-- so it bypasses RLS (same pattern as score_match).

CREATE OR REPLACE FUNCTION public.spend_coins_for_powerup(
  p_user_id    uuid,
  p_prono_id   uuid,
  p_match_id   uuid,
  p_type       text,
  p_amount     integer,
  p_competition_id uuid
)
RETURNS integer   -- returns remaining coins, or -1 if insufficient
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current integer;
BEGIN
  SELECT coins_in_prono INTO v_current
  FROM public.prono_members
  WHERE user_id = p_user_id AND prono_id = p_prono_id;

  IF NOT FOUND OR v_current < p_amount THEN
    RETURN -1;
  END IF;

  UPDATE public.prono_members
  SET coins_in_prono = coins_in_prono - p_amount
  WHERE user_id = p_user_id AND prono_id = p_prono_id;

  INSERT INTO public.coin_transactions
    (user_id, amount, type, reason, competition_id, match_id, prono_id)
  VALUES
    (p_user_id, p_amount, 'spend', 'Power-up: ' || p_type,
     p_competition_id, p_match_id, p_prono_id);

  RETURN v_current - p_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_coins_for_powerup(uuid, uuid, uuid, text, integer, uuid) TO authenticated;
