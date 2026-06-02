ALTER TABLE public.prono_members ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
