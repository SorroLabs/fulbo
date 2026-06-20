-- Enable Realtime for matches so RealtimeLeaderboard can react to a match
-- transitioning to 'finished' without requiring a manual page reload.
-- REPLICA IDENTITY FULL is required so UPDATE events include the old row
-- (not just the primary key), since the client compares payload.old.status.

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
