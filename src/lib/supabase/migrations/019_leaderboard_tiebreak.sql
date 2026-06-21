-- Tiebreak for tied total_points: most exact predictions, then % effectiveness
-- (total_points / max possible base points across predicted matches).
create or replace function public.get_global_leaderboard(p_competition_id uuid, p_limit integer default 50)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  total_points bigint,
  exact_predictions bigint,
  correct_predictions bigint,
  wrong_predictions bigint,
  rank bigint
) language sql as $$
  with best_per_match as (
    -- One row per user per match: best base prediction across all their pronos
    select
      pr.user_id,
      pr.match_id,
      max(
        public.calculate_prediction_points(
          pr.home_score, pr.away_score,
          m.home_score,  m.away_score,
          m.phase
        )
      )                                                                         as base_pts,
      bool_or(pr.home_score = m.home_score and pr.away_score = m.away_score)   as is_exact,
      bool_or(
        (pr.home_score > pr.away_score and m.home_score > m.away_score) or
        (pr.home_score < pr.away_score and m.home_score < m.away_score) or
        (pr.home_score = pr.away_score and m.home_score = m.away_score)
      )                                                                         as is_correct_result,
      max(case when m.phase = 'groups' then 10 else 20 end)                     as max_pts
    from public.predictions pr
    inner join public.matches m on m.id = pr.match_id
    where m.competition_id = p_competition_id
      and pr.points_earned  is not null
    group by pr.user_id, pr.match_id
  ),
  grouped as (
    select
      b.user_id,
      coalesce(sum(b.base_pts), 0)                                      as total_points,
      count(*) filter (where b.is_exact)                                as exact_predictions,
      count(*) filter (where b.is_correct_result and not b.is_exact)    as correct_predictions,
      count(*) filter (where not b.is_correct_result)                   as wrong_predictions,
      coalesce(sum(b.max_pts), 0)                                       as max_points
    from best_per_match b
    group by b.user_id
  )
  select
    g.user_id,
    p.full_name,
    p.avatar_url,
    g.total_points,
    g.exact_predictions,
    g.correct_predictions,
    g.wrong_predictions,
    rank() over (
      order by
        g.total_points desc,
        g.exact_predictions desc,
        (case when g.max_points > 0 then g.total_points::numeric / g.max_points else 0 end) desc
    ) as rank
  from grouped g
  inner join public.profiles p on p.id = g.user_id
  order by
    g.total_points desc,
    g.exact_predictions desc,
    (case when g.max_points > 0 then g.total_points::numeric / g.max_points else 0 end) desc
  limit p_limit;
$$;
