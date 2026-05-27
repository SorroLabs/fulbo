export type UserRole = "user" | "admin"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
  timezone: string
  role: UserRole
  coins: number
  created_at: string
}

export interface Competition {
  id: string
  name: string
  slug: string
  logo_url: string | null
  country: string | null
  season: string
  status: "upcoming" | "active" | "finished"
  start_date: string
  end_date: string | null
  api_league_id: number | null
  created_at: string
}

export interface Match {
  id: string
  competition_id: string
  api_match_id: number | null
  home_team: string
  away_team: string
  home_team_logo: string | null
  away_team_logo: string | null
  home_score: number | null
  away_score: number | null
  match_date: string
  phase: "groups" | "round_of_32" | "round_of_16" | "quarterfinals" | "semifinals" | "final" | "third_place"
  group_name: string | null
  status: "upcoming" | "live" | "finished"
  created_at: string
}

export interface Prono {
  id: string
  competition_id: string
  owner_id: string
  name: string
  description: string | null
  is_public: boolean
  power_ups_enabled: boolean
  invite_code: string
  max_members: number
  points_exact: number
  points_result: number
  status: "active" | "finished"
  created_at: string
  competition?: Competition
  owner?: Profile
  member_count?: number
}


export interface PronoMember {
  id: string
  prono_id: string
  user_id: string
  total_points: number
  rank: number | null
  coins_in_prono: number
  joined_at: string
  profile?: Profile
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  competition_id: string
  home_score: number
  away_score: number
  points_earned: number | null
  is_locked: boolean
  created_at: string
  updated_at: string
  match?: Match
}

export interface SpecialPrediction {
  id: string
  user_id: string
  competition_id: string
  type: "champion" | "top_scorer" | "surprise_team"
  value: string
  points_earned: number | null
  created_at: string
}

export interface LeaderboardEntry {
  user_id: string
  full_name: string
  avatar_url: string | null
  total_points: number
  exact_predictions: number
  correct_predictions: number
  wrong_predictions: number
  coins: number
  rank: number
}

export interface LeaderboardSnapshot {
  id: string
  competition_id: string
  prono_id: string | null
  match_id: string
  snapshot_data: LeaderboardEntry[]
  created_at: string
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  type: "earn" | "spend" | "admin_grant"
  reason: string
  competition_id: string | null
  match_id: string | null
  created_at: string
}

export type PowerUpType = "late_change" | "double_points" | "spy" | "wildcard"

export interface PowerUpUse {
  id: string
  user_id: string
  prono_id: string
  match_id: string
  type: PowerUpType
  coins_spent: number
  target_user_id: string | null
  used_at: string
}

export interface PronoPowerUpConfig {
  prono_id: string
  type: PowerUpType
  cost: number
  enabled: boolean
}

export interface Duel {
  id: string
  challenger_id: string
  challenged_id: string
  match_id: string
  coins_bet: number
  status: "pending" | "accepted" | "rejected" | "finished"
  winner_id: string | null
  created_at: string
  challenger?: Profile
  challenged?: Profile
}

export type PhaseMultiplier = {
  groups: { exact: number; result: number }
  round_of_32: { exact: number; result: number }
  round_of_16: { exact: number; result: number }
  quarterfinals: { exact: number; result: number }
  semifinals: { exact: number; result: number }
  final: { exact: number; result: number }
  third_place: { exact: number; result: number }
}

export const PHASE_MULTIPLIERS: PhaseMultiplier = {
  groups: { exact: 3, result: 1 },
  round_of_32: { exact: 5, result: 2 },
  round_of_16: { exact: 6, result: 2 },
  quarterfinals: { exact: 8, result: 3 },
  semifinals: { exact: 10, result: 4 },
  final: { exact: 16, result: 6 },
  third_place: { exact: 8, result: 3 },
}

export const SPECIAL_PREDICTION_POINTS = {
  champion: 10,
  top_scorer: 8,
  surprise_team: 8,
}

export const POWER_UP_COSTS: Record<PowerUpType, number> = {
  late_change: 20,
  double_points: 15,
  spy: 15,
  wildcard: 25,
}

export const POWER_UP_LABELS: Record<PowerUpType, string> = {
  late_change: "Cambio tardío",
  double_points: "Doble puntos",
  spy: "Espía",
  wildcard: "Comodín",
}

export const POWER_UP_DESCRIPTIONS: Record<PowerUpType, string> = {
  late_change: "Extendé el plazo de tu predicción hasta 2 minutos antes del partido (máx. 3 por torneo).",
  double_points: "Duplicá tus puntos si acertás el resultado.",
  spy: "Mirá la predicción de un rival antes de que cierre el plazo.",
  wildcard: "Si errás el resultado, igual ganás 1 punto.",
}

export const COIN_REWARDS = {
  correct_result: 1,
  exact_score: 3,
  special_prediction: 10,
  streak_3: 5,
  streak_5: 10,
  full_round: 2,
  invite_friend: 5,
  first_prediction: 5,
  join_competition: 100,
}
