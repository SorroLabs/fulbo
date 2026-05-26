-- fulbo.co database schema
-- Run this in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  coins integer not null default 0,
  created_at timestamptz default now()
);

-- Competitions
create table public.competitions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  country text,
  season text not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'finished')),
  start_date date not null,
  end_date date,
  api_league_id integer,
  created_at timestamptz default now()
);

-- Matches
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid references public.competitions on delete cascade not null,
  api_match_id integer,
  home_team text not null,
  away_team text not null,
  home_team_logo text,
  away_team_logo text,
  home_score integer,
  away_score integer,
  match_date timestamptz not null,
  phase text not null default 'groups' check (phase in ('groups', 'round_of_32', 'round_of_16', 'quarterfinals', 'semifinals', 'final', 'third_place')),
  group_name text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished')),
  created_at timestamptz default now()
);

-- Pollas
create table public.pronos (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid references public.competitions on delete cascade not null,
  owner_id uuid references public.profiles on delete cascade not null,
  name text not null,
  description text,
  is_public boolean not null default true,
  power_ups_enabled boolean not null default true,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  max_members integer not null default 100,
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz default now()
);

-- Polla members
create table public.prono_members (
  id uuid primary key default uuid_generate_v4(),
  prono_id uuid references public.pronos on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  total_points integer not null default 0,
  rank integer,
  coins_in_prono integer not null default 100,
  joined_at timestamptz default now(),
  unique(prono_id, user_id)
);

-- Predictions
create table public.predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  match_id uuid references public.matches on delete cascade not null,
  competition_id uuid references public.competitions on delete cascade not null,
  home_score integer not null,
  away_score integer not null,
  points_earned integer,
  is_locked boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id)
);

-- Special predictions
create table public.special_predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  competition_id uuid references public.competitions on delete cascade not null,
  type text not null check (type in ('champion', 'top_scorer', 'surprise_team')),
  value text not null,
  points_earned integer,
  created_at timestamptz default now(),
  unique(user_id, competition_id, type)
);

-- Leaderboard snapshots (captured after each match finishes)
create table public.leaderboard_snapshots (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid references public.competitions on delete cascade not null,
  prono_id uuid references public.pronos on delete cascade,
  match_id uuid references public.matches on delete cascade not null,
  snapshot_data jsonb not null,
  created_at timestamptz default now()
);

-- Coin transactions
create table public.coin_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('earn', 'spend', 'admin_grant')),
  reason text not null,
  competition_id uuid references public.competitions on delete set null,
  match_id uuid references public.matches on delete set null,
  prono_id uuid references public.pronos on delete set null,
  created_at timestamptz default now()
);

-- Power-up uses
create table public.power_up_uses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  prono_id uuid references public.pronos on delete cascade not null,
  match_id uuid references public.matches on delete cascade not null,
  type text not null check (type in ('late_change', 'double_points', 'spy', 'wildcard')),
  coins_spent integer not null,
  target_user_id uuid references public.profiles on delete set null,
  used_at timestamptz default now(),
  unique(user_id, prono_id, match_id, type)
);

-- Power-up config per prono (owner can override default costs/availability)
create table public.prono_powerup_config (
  prono_id uuid not null references public.pronos on delete cascade,
  type text not null check (type in ('late_change', 'double_points', 'spy', 'wildcard')),
  cost integer not null check (cost >= 0),
  enabled boolean not null default true,
  primary key (prono_id, type)
);

-- Duels
create table public.duels (
  id uuid primary key default uuid_generate_v4(),
  challenger_id uuid references public.profiles on delete cascade not null,
  challenged_id uuid references public.profiles on delete cascade not null,
  match_id uuid references public.matches on delete cascade not null,
  coins_bet integer not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'finished')),
  winner_id uuid references public.profiles on delete set null,
  created_at timestamptz default now()
);

-- Competition participants (admin-approved)
create table public.competition_participants (
  id uuid primary key default uuid_generate_v4(),
  competition_id uuid references public.competitions on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  unique(competition_id, user_id)
);

-- ─── INDEXES ────────────────────────────────────────────────
create index on public.predictions (user_id, competition_id);
create index on public.predictions (match_id);
create index on public.prono_members (prono_id);
create index on public.prono_members (user_id);
create index on public.matches (competition_id, match_date);
create index on public.leaderboard_snapshots (competition_id, created_at desc);
create index on public.coin_transactions (user_id, created_at desc);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.matches enable row level security;
alter table public.pronos enable row level security;
alter table public.prono_members enable row level security;
alter table public.predictions enable row level security;
alter table public.special_predictions enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.power_up_uses enable row level security;
alter table public.prono_powerup_config enable row level security;
alter table public.duels enable row level security;
alter table public.competition_participants enable row level security;

-- Profiles: public read, own write
create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = id);

-- Competitions: public read, admin write
create policy "competitions_public_read" on public.competitions for select using (true);
create policy "competitions_admin_write" on public.competitions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Matches: public read, admin write
create policy "matches_public_read" on public.matches for select using (true);
create policy "matches_admin_write" on public.matches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Pollas: public pronos visible to all, private only to members
create policy "pronos_read" on public.pronos for select using (
  is_public = true or
  owner_id = auth.uid() or
  exists (select 1 from public.prono_members where prono_id = pronos.id and user_id = auth.uid())
);
create policy "pronos_insert" on public.pronos for insert with check (auth.uid() = owner_id);
create policy "pronos_update" on public.pronos for update using (auth.uid() = owner_id);
create policy "pronos_delete" on public.pronos for delete using (auth.uid() = owner_id);

-- Polla members
create policy "prono_members_read" on public.prono_members for select using (
  exists (select 1 from public.pronos where id = prono_id and (
    is_public = true or owner_id = auth.uid() or
    exists (select 1 from public.prono_members pm where pm.prono_id = prono_members.prono_id and pm.user_id = auth.uid())
  ))
);
create policy "prono_members_insert" on public.prono_members for insert with check (auth.uid() = user_id);
create policy "prono_members_delete" on public.prono_members for delete using (auth.uid() = user_id);

-- Predictions: users see their own, others see only after match is locked (or via spy power-up)
create policy "predictions_own_read" on public.predictions for select using (
  user_id = auth.uid() or
  exists (select 1 from public.matches where id = match_id and status = 'finished') or
  exists (
    select 1 from public.power_up_uses pu
    where pu.user_id = auth.uid()
      and pu.match_id = predictions.match_id
      and pu.type = 'spy'
      and pu.target_user_id = predictions.user_id
  )
);
create policy "predictions_own_write" on public.predictions for all using (auth.uid() = user_id);

-- Special predictions
create policy "special_predictions_own" on public.special_predictions for all using (auth.uid() = user_id);
create policy "special_predictions_read_finished" on public.special_predictions for select using (
  user_id = auth.uid() or
  exists (select 1 from public.competitions where id = competition_id and status = 'finished')
);

-- Leaderboard snapshots: public read
create policy "snapshots_public_read" on public.leaderboard_snapshots for select using (true);

-- Coin transactions: own only
create policy "coins_own_read" on public.coin_transactions for select using (auth.uid() = user_id);

-- Power-up uses: own read/write; prono members see power-ups after match starts
create policy "powerups_own_write" on public.power_up_uses for all using (auth.uid() = user_id);
create policy "powerups_prono_read_after_lock" on public.power_up_uses for select using (
  auth.uid() = user_id or
  (
    exists (select 1 from public.prono_members where prono_id = power_up_uses.prono_id and user_id = auth.uid()) and
    exists (select 1 from public.matches where id = power_up_uses.match_id and status != 'upcoming')
  )
);

-- Power-up config: prono members read, owner write
create policy "powerup_config_member_read" on public.prono_powerup_config for select using (
  exists (select 1 from public.prono_members where prono_id = prono_powerup_config.prono_id and user_id = auth.uid())
);
create policy "powerup_config_owner_write" on public.prono_powerup_config for all using (
  exists (select 1 from public.pronos where id = prono_powerup_config.prono_id and owner_id = auth.uid())
);

-- Duels
create policy "duels_participants" on public.duels for select using (
  auth.uid() = challenger_id or auth.uid() = challenged_id
);
create policy "duels_create" on public.duels for insert with check (auth.uid() = challenger_id);
create policy "duels_update" on public.duels for update using (
  auth.uid() = challenger_id or auth.uid() = challenged_id
);

-- Competition participants
create policy "participants_own_read" on public.competition_participants for select using (auth.uid() = user_id);
create policy "participants_admin_read" on public.competition_participants for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "participants_insert" on public.competition_participants for insert with check (auth.uid() = user_id);

-- Helper: increment coins atomically
create or replace function public.increment_profile_coins(uid uuid, amount integer)
returns void language sql security definer as $$
  update public.profiles set coins = coins + amount where id = uid;
$$;

-- ─── FUNCTIONS & TRIGGERS ───────────────────────────────────

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update prediction timestamp
create or replace function public.update_prediction_timestamp()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger predictions_updated_at
  before update on public.predictions
  for each row execute procedure public.update_prediction_timestamp();

-- Calculate points for a prediction after match finishes
create or replace function public.calculate_prediction_points(
  p_user_pred_home integer,
  p_user_pred_away integer,
  p_real_home integer,
  p_real_away integer,
  p_phase text
) returns integer language plpgsql as $$
declare
  exact_pts integer;
  result_pts integer;
  user_outcome text;
  real_outcome text;
begin
  case p_phase
    when 'groups' then exact_pts := 3; result_pts := 1;
    when 'round_of_16' then exact_pts := 5; result_pts := 2;
    when 'quarterfinals' then exact_pts := 5; result_pts := 2;
    when 'semifinals' then exact_pts := 8; result_pts := 3;
    when 'final' then exact_pts := 8; result_pts := 3;
    when 'third_place' then exact_pts := 5; result_pts := 2;
    else exact_pts := 3; result_pts := 1;
  end case;

  if p_user_pred_home = p_real_home and p_user_pred_away = p_real_away then
    return exact_pts;
  end if;

  if p_user_pred_home > p_user_pred_away then user_outcome := 'home';
  elsif p_user_pred_home < p_user_pred_away then user_outcome := 'away';
  else user_outcome := 'draw'; end if;

  if p_real_home > p_real_away then real_outcome := 'home';
  elsif p_real_home < p_real_away then real_outcome := 'away';
  else real_outcome := 'draw'; end if;

  if user_outcome = real_outcome then return result_pts; end if;

  return 0;
end;
$$;

-- Score all predictions for a finished match
create or replace function public.score_match(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  v_match matches%rowtype;
  v_pred predictions%rowtype;
  v_pts integer;
  v_double boolean;
  v_wildcard boolean;
  v_coin_amount integer;
  v_pm record;
begin
  select * into v_match from public.matches where id = p_match_id and status = 'finished';
  if not found then return; end if;

  for v_pred in select * from public.predictions where match_id = p_match_id and points_earned is null loop
    v_pts := public.calculate_prediction_points(
      v_pred.home_score, v_pred.away_score,
      v_match.home_score, v_match.away_score,
      v_match.phase
    );

    -- Check double_points power-up (competition-wide effect)
    select exists(
      select 1 from public.power_up_uses
      where user_id = v_pred.user_id and match_id = p_match_id and type = 'double_points'
    ) into v_double;

    if v_double and v_pts > 0 then v_pts := v_pts * 2; end if;

    -- Apply wildcard: if 0 pts, give result points
    if v_pts = 0 then
      select exists(
        select 1 from public.power_up_uses
        where user_id = v_pred.user_id and match_id = p_match_id and type = 'wildcard'
      ) into v_wildcard;

      if v_wildcard then
        case v_match.phase
          when 'groups' then v_pts := 1;
          when 'final', 'semifinals' then v_pts := 3;
          else v_pts := 2;
        end case;
      end if;
    end if;

    update public.predictions set points_earned = v_pts where id = v_pred.id;

    -- Determine coin reward
    v_coin_amount := 0;
    if v_pts > 0 then
      if v_pred.home_score = v_match.home_score and v_pred.away_score = v_match.away_score then
        v_coin_amount := 3;
      else
        v_coin_amount := 1;
      end if;
    end if;

    -- Credit coins_in_prono for every prono the user is in for this competition
    if v_coin_amount > 0 then
      for v_pm in
        select pm.id as pm_id, pm.prono_id
        from public.prono_members pm
        join public.pronos po on po.id = pm.prono_id
        where pm.user_id = v_pred.user_id
          and po.competition_id = v_pred.competition_id
      loop
        update public.prono_members
        set coins_in_prono = coins_in_prono + v_coin_amount
        where id = v_pm.pm_id;

        insert into public.coin_transactions (user_id, amount, type, reason, competition_id, match_id, prono_id)
        values (
          v_pred.user_id,
          v_coin_amount,
          'earn',
          case when v_coin_amount = 3 then 'Marcador exacto' else 'Resultado correcto' end,
          v_pred.competition_id,
          p_match_id,
          v_pm.prono_id
        );
      end loop;
    end if;

    -- Update prono_members total_points
    update public.prono_members pm
    set total_points = (
      select coalesce(sum(p.points_earned), 0)
      from public.predictions p
      where p.user_id = v_pred.user_id
        and p.competition_id = v_pred.competition_id
        and p.points_earned is not null
    )
    where pm.user_id = v_pred.user_id
      and exists (
        select 1 from public.pronos po
        where po.id = pm.prono_id and po.competition_id = v_pred.competition_id
      );
  end loop;
end;
$$;

-- Revert a match score (admin use: reset to upcoming)
create or replace function public.revert_match_score(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  v_match matches%rowtype;
  v_pred predictions%rowtype;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found then return; end if;

  update public.matches
  set status = 'upcoming', home_score = null, away_score = null
  where id = p_match_id;

  for v_pred in select * from public.predictions where match_id = p_match_id and points_earned is not null loop
    update public.predictions set points_earned = null where id = v_pred.id;

    delete from public.coin_transactions
    where match_id = p_match_id and user_id = v_pred.user_id;

    -- Recalculate coins_in_prono from remaining transactions (100 = initial grant)
    update public.prono_members pm
    set coins_in_prono = 100 + coalesce((
      select sum(case when ct.type in ('earn', 'admin_grant') then ct.amount else -ct.amount end)
      from public.coin_transactions ct
      where ct.user_id = v_pred.user_id
        and ct.prono_id = pm.prono_id
    ), 0)
    where pm.user_id = v_pred.user_id
      and exists (
        select 1 from public.pronos po
        where po.id = pm.prono_id and po.competition_id = v_pred.competition_id
      );

    -- Recalculate total_points
    update public.prono_members pm
    set total_points = (
      select coalesce(sum(p.points_earned), 0)
      from public.predictions p
      where p.user_id = v_pred.user_id
        and p.competition_id = v_pred.competition_id
        and p.points_earned is not null
    )
    where pm.user_id = v_pred.user_id
      and exists (
        select 1 from public.pronos po
        where po.id = pm.prono_id and po.competition_id = v_pred.competition_id
      );
  end loop;
end;
$$;

-- Get global leaderboard for a competition
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
  select
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    coalesce(sum(pr.points_earned), 0) as total_points,
    count(*) filter (where pr.points_earned in (3,5,8,6,10,16)) as exact_predictions,
    count(*) filter (where pr.points_earned in (1,2,3)) as correct_predictions,
    count(*) filter (where pr.points_earned = 0) as wrong_predictions,
    rank() over (order by coalesce(sum(pr.points_earned), 0) desc) as rank
  from public.profiles p
  inner join public.predictions pr on pr.user_id = p.id and pr.competition_id = p_competition_id
  where pr.points_earned is not null
  group by p.id, p.full_name, p.avatar_url
  order by total_points desc
  limit p_limit;
$$;
