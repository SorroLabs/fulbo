-- Allow phase_bonus as a valid coin transaction type
ALTER TABLE public.coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_type_check
  CHECK (type IN ('earn', 'spend', 'admin_grant', 'phase_bonus'));
