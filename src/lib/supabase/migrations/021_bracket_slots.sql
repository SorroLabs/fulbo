-- Bracket slot: defines visual position within each phase for bracket display.
-- Within each phase, lower slot = higher (top) position in bracket.
-- Left half of bracket: slots 1..N/2, right half: slots N/2+1..N

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bracket_slot integer;

-- ══════════════════════════════════════════════
-- ROUND OF 32
-- LEFT SIDE (slots 1-8, top to bottom)
-- ══════════════════════════════════════════════

UPDATE public.matches SET bracket_slot = 1 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Alemania%' OR away_team ILIKE '%Alemania%');

UPDATE public.matches SET bracket_slot = 2 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Francia%'  OR away_team ILIKE '%Francia%')
  AND (home_team ILIKE '%Suecia%'   OR away_team ILIKE '%Suecia%');

UPDATE public.matches SET bracket_slot = 3 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Sudáfrica%' OR away_team ILIKE '%Sudáfrica%');

UPDATE public.matches SET bracket_slot = 4 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Países Bajos%' OR away_team ILIKE '%Países Bajos%');

UPDATE public.matches SET bracket_slot = 5 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Portugal%' OR away_team ILIKE '%Portugal%')
  AND (home_team ILIKE '%Croacia%'  OR away_team ILIKE '%Croacia%');

UPDATE public.matches SET bracket_slot = 6 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%España%' OR away_team ILIKE '%España%')
  AND (home_team ILIKE '%Austria%' OR away_team ILIKE '%Austria%');

UPDATE public.matches SET bracket_slot = 7 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Bosnia%' OR away_team ILIKE '%Bosnia%');

UPDATE public.matches SET bracket_slot = 8 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Bélgica%' OR away_team ILIKE '%Bélgica%')
  AND (home_team ILIKE '%Senegal%' OR away_team ILIKE '%Senegal%');

-- RIGHT SIDE (slots 9-16, top to bottom)

UPDATE public.matches SET bracket_slot = 9 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Brasil%' OR away_team ILIKE '%Brasil%');

UPDATE public.matches SET bracket_slot = 10 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Marfil%' OR away_team ILIKE '%Marfil%');

UPDATE public.matches SET bracket_slot = 11 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%México%'  OR away_team ILIKE '%México%')
  AND (home_team ILIKE '%Ecuador%' OR away_team ILIKE '%Ecuador%');

UPDATE public.matches SET bracket_slot = 12 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Inglaterra%' OR away_team ILIKE '%Inglaterra%');

UPDATE public.matches SET bracket_slot = 13 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Argentina%'  OR away_team ILIKE '%Argentina%')
  AND (home_team ILIKE '%Cabo Verde%' OR away_team ILIKE '%Cabo Verde%');

UPDATE public.matches SET bracket_slot = 14 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Australia%' OR away_team ILIKE '%Australia%');

UPDATE public.matches SET bracket_slot = 15 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Suiza%'   OR away_team ILIKE '%Suiza%')
  AND (home_team ILIKE '%Argelia%' OR away_team ILIKE '%Argelia%');

UPDATE public.matches SET bracket_slot = 16 WHERE phase = 'round_of_32'
  AND (home_team ILIKE '%Colombia%' OR away_team ILIKE '%Colombia%')
  AND (home_team ILIKE '%Ghana%'    OR away_team ILIKE '%Ghana%');

-- ══════════════════════════════════════════════
-- ROUND OF 16
-- LEFT SIDE (slots 1-4)
-- ══════════════════════════════════════════════

UPDATE public.matches SET bracket_slot = 1 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%Francia%'  OR away_team ILIKE '%Francia%')
  AND (home_team ILIKE '%Paraguay%' OR away_team ILIKE '%Paraguay%');

UPDATE public.matches SET bracket_slot = 2 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%Canadá%'   OR away_team ILIKE '%Canadá%')
  AND (home_team ILIKE '%Marruecos%' OR away_team ILIKE '%Marruecos%');

UPDATE public.matches SET bracket_slot = 3 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%Portugal%' OR away_team ILIKE '%Portugal%')
  AND (home_team ILIKE '%España%'   OR away_team ILIKE '%España%');

-- Slot 4: EE.UU./Estados Unidos vs Bélgica — identified by Bélgica in R16
UPDATE public.matches SET bracket_slot = 4 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%Bélgica%' OR away_team ILIKE '%Bélgica%');

-- RIGHT SIDE (slots 5-8)

UPDATE public.matches SET bracket_slot = 5 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%Brasil%'  OR away_team ILIKE '%Brasil%')
  AND (home_team ILIKE '%Noruega%' OR away_team ILIKE '%Noruega%');

UPDATE public.matches SET bracket_slot = 6 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%México%'     OR away_team ILIKE '%México%')
  AND (home_team ILIKE '%Inglaterra%' OR away_team ILIKE '%Inglaterra%');

UPDATE public.matches SET bracket_slot = 7 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%Argentina%' OR away_team ILIKE '%Argentina%')
  AND (home_team ILIKE '%Egipto%'    OR away_team ILIKE '%Egipto%');

UPDATE public.matches SET bracket_slot = 8 WHERE phase = 'round_of_16'
  AND (home_team ILIKE '%Suiza%'    OR away_team ILIKE '%Suiza%')
  AND (home_team ILIKE '%Colombia%' OR away_team ILIKE '%Colombia%');

-- ══════════════════════════════════════════════
-- QUARTERFINALS
-- LEFT SIDE (slots 1-2), RIGHT SIDE (slots 3-4)
-- ══════════════════════════════════════════════

UPDATE public.matches SET bracket_slot = 1 WHERE phase = 'quarterfinals'
  AND (home_team ILIKE '%Francia%'   OR away_team ILIKE '%Francia%')
  AND (home_team ILIKE '%Marruecos%' OR away_team ILIKE '%Marruecos%');

UPDATE public.matches SET bracket_slot = 2 WHERE phase = 'quarterfinals'
  AND (home_team ILIKE '%España%'  OR away_team ILIKE '%España%')
  AND (home_team ILIKE '%Bélgica%' OR away_team ILIKE '%Bélgica%');

UPDATE public.matches SET bracket_slot = 3 WHERE phase = 'quarterfinals'
  AND (home_team ILIKE '%Noruega%'    OR away_team ILIKE '%Noruega%')
  AND (home_team ILIKE '%Inglaterra%' OR away_team ILIKE '%Inglaterra%');

UPDATE public.matches SET bracket_slot = 4 WHERE phase = 'quarterfinals'
  AND (home_team ILIKE '%Argentina%' OR away_team ILIKE '%Argentina%')
  AND (home_team ILIKE '%Suiza%'     OR away_team ILIKE '%Suiza%');

-- ══════════════════════════════════════════════
-- SEMIFINALS
-- Slot 1 = left (Francia vs España), Slot 2 = right (Inglaterra vs Argentina)
-- ══════════════════════════════════════════════

UPDATE public.matches SET bracket_slot = 1 WHERE phase = 'semifinals'
  AND (home_team ILIKE '%Francia%' OR away_team ILIKE '%Francia%');

UPDATE public.matches SET bracket_slot = 2 WHERE phase = 'semifinals'
  AND (home_team ILIKE '%Inglaterra%' OR away_team ILIKE '%Inglaterra%');

-- ══════════════════════════════════════════════
-- FINAL
-- ══════════════════════════════════════════════

UPDATE public.matches SET bracket_slot = 1 WHERE phase = 'final';

-- Verify result (run separately):
-- SELECT phase, bracket_slot, home_team, away_team
-- FROM public.matches WHERE phase != 'groups'
-- ORDER BY phase, bracket_slot;
