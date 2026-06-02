"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendPushToUsers } from "@/lib/notifications"

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, "")                       // remove special chars
    .replace(/\s+/g, " ").trim()
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[a.length][b.length]
}

// Matches "Mbappe" with "Kylian Mbappé", "messi" with "Lionel Messi", "Haland" with "Haaland"
function isNameMatch(userInput: string, adminAnswer: string): boolean {
  const a = normalize(userInput)
  const b = normalize(adminAnswer)
  if (a === b) return true
  // One is a substring of the other (handles "Messi" in "Lionel Messi")
  if (a.includes(b) || b.includes(a)) return true
  // Any significant word matches (≥4 chars to skip "de", "van", "del")
  const wordsA = a.split(" ").filter(w => w.length >= 4)
  const wordsB = b.split(" ").filter(w => w.length >= 4)
  if (wordsA.some(wa => wordsB.some(wb => wa === wb))) return true
  // Fuzzy: last word of each with Levenshtein ≤2 (handles "Haland"/"Haaland", "Mbappe"/"Mbappe")
  const lastA = wordsA.at(-1) ?? a
  const lastB = wordsB.at(-1) ?? b
  if (lastA.length >= 4 && lastB.length >= 4 && levenshtein(lastA, lastB) <= 2) return true
  return false
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: "No autenticado" }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { supabase: null, error: "Sin permisos" }
  return { supabase, error: null }
}

export async function createTestMatch({
  competitionId,
  minutesFromNow,
}: {
  competitionId: string
  minutesFromNow: number
}) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }

  const matchDate = new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString()
  const { error: insertError } = await supabase.from("matches").insert({
    competition_id: competitionId,
    home_team: "España",
    away_team: "Argentina",
    match_date: matchDate,
    phase: "groups",
    group_name: "TEST",
    status: "upcoming",
  })

  if (insertError) return { error: insertError.message }
  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function deleteTestMatches({ competitionId }: { competitionId: string }) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }

  await supabase.from("matches").delete()
    .eq("competition_id", competitionId)
    .eq("group_name", "TEST")

  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function revertMatchResult({ matchId }: { matchId: string }) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError }

  const { error } = await supabase!.rpc("revert_match_score", { p_match_id: matchId })

  if (error) return { error: error.message }

  await supabase.from("leaderboard_snapshots").delete().eq("match_id", matchId)

  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function reportMatchResult({
  matchId,
  homeScore,
  awayScore,
}: {
  matchId: string
  homeScore: number
  awayScore: number
}) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError || !supabase) return { error: authError }

  const { error } = await supabase!.from("matches").update({
    home_score: homeScore,
    away_score: awayScore,
    status: "finished",
  }).eq("id", matchId)

  if (error) return { error: error.message }

  await supabase.rpc("score_match", { p_match_id: matchId })

  await takeSnapshots(supabase, matchId)
  await awardPhaseBonus(supabase, matchId)
  await awardMatchdayWinner(supabase, matchId)
  await autoScoreChampion(supabase, matchId, homeScore, awayScore)
  notifyMatchResult(supabase, matchId, homeScore, awayScore).catch(() => {})

  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
}

async function notifyMatchResult(supabase: any, matchId: string, homeScore: number, awayScore: number) {
  const { data: match } = await supabase
    .from("matches")
    .select("home_team, away_team, competition_id")
    .eq("id", matchId)
    .single()
  if (!match) return

  // Get all unique members across all pronos in this competition
  const { data: pronos } = await supabase
    .from("pronos")
    .select("id")
    .eq("competition_id", match.competition_id)
  if (!pronos?.length) return

  const { data: members } = await supabase
    .from("prono_members")
    .select("user_id, predictions!inner(points_earned, match_id)")
    .in("prono_id", pronos.map((p: any) => p.id))
    .eq("predictions.match_id", matchId)

  const uniqueUserIds = [...new Set((members ?? []).map((m: any) => m.user_id))] as string[]
  if (!uniqueUserIds.length) return

  // Get individual points per user
  const { data: preds } = await supabase
    .from("predictions")
    .select("user_id, points_earned")
    .eq("match_id", matchId)
    .in("user_id", uniqueUserIds)

  const ptsByUser = new Map((preds ?? []).map((p: any) => [p.user_id, p.points_earned ?? 0]))

  await sendPushToUsers(uniqueUserIds, {
    title: `${match.home_team} ${homeScore} - ${awayScore} ${match.away_team}`,
    body: "Resultado cargado. ¡Mirá cuántos puntos sumaste!",
    url: `/pronos`,
  })
}

async function takeSnapshots(supabase: any, matchId: string) {
  const { data: match } = await supabase
    .from("matches")
    .select("competition_id")
    .eq("id", matchId)
    .single()
  if (!match) return

  const competitionId = match.competition_id

  // Remove any existing snapshots for this match (handles re-scoring)
  await supabase.from("leaderboard_snapshots").delete().eq("match_id", matchId)

  // Global snapshot — read from predictions directly (same as get_global_leaderboard RPC)
  const { data: globalRanking } = await supabase.rpc("get_global_leaderboard", {
    p_competition_id: competitionId,
    p_limit: 200,
  })

  if (globalRanking?.length) {
    await supabase.from("leaderboard_snapshots").insert({
      competition_id: competitionId,
      prono_id: null,
      match_id: matchId,
      snapshot_data: globalRanking.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name ?? "Usuario",
        total_points: p.total_points,
        rank: p.rank,
      })),
    })
  }

  // Per-prono snapshots
  const { data: pronos } = await supabase
    .from("pronos")
    .select("id")
    .eq("competition_id", competitionId)

  if (!pronos?.length) return

  const inserts = (
    await Promise.all(
      pronos.map(async (prono: any) => {
        const { data: members } = await supabase
          .from("prono_members")
          .select("user_id, total_points, profiles(full_name, nickname)")
          .eq("prono_id", prono.id)
          .order("total_points", { ascending: false })
        if (!members?.length) return null
        return {
          competition_id: competitionId,
          prono_id: prono.id,
          match_id: matchId,
          snapshot_data: members.map((m: any, i: number) => ({
            user_id: m.user_id,
            full_name: m.profiles?.nickname ?? m.profiles?.full_name ?? "Usuario",
            total_points: m.total_points,
            rank: i + 1,
          })),
        }
      })
    )
  ).filter(Boolean)

  if (inserts.length) {
    await supabase.from("leaderboard_snapshots").insert(inserts)
  }
}

const PHASE_LABELS: Record<string, string> = {
  groups: "Grupos",
  round_of_32: "Ronda de 32",
  round_of_16: "Octavos de final",
  quarterfinals: "Cuartos de final",
  semifinals: "Semifinales",
  third_place: "Tercer puesto",
}

// Derives group-stage matchday using same ≤48h clustering as client-side computeMatchdays
function computeMatchday(matchId: string, groupMatches: { id: string; match_date: string; group_name: string | null }[]): number {
  const byGroup = new Map<string, typeof groupMatches>()
  for (const m of groupMatches) {
    const g = m.group_name ?? "__"
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(m)
  }
  for (const gMatches of byGroup.values()) {
    const sorted = [...gMatches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    let fecha = 1
    let prevTime: number | null = null
    for (const m of sorted) {
      const t = new Date(m.match_date).getTime()
      if (prevTime !== null && t - prevTime > 48 * 3600 * 1000) fecha++
      if (m.id === matchId) return fecha
      prevTime = t
    }
  }
  return 1
}

async function awardPhaseBonus(supabase: any, matchId: string) {
  // Get the scored match
  const { data: match } = await supabase
    .from("matches")
    .select("competition_id, phase, match_date, group_name")
    .eq("id", matchId)
    .single()
  if (!match || match.phase === "final") return

  const { competition_id: competitionId, phase } = match

  // Fetch all matches for this competition in this phase
  const { data: phaseMatches } = await supabase
    .from("matches")
    .select("id, status, match_date, group_name")
    .eq("competition_id", competitionId)
    .eq("phase", phase)
  if (!phaseMatches?.length) return

  // Determine bonus key: for groups, per matchday; for knockout, per phase
  let bonusKey: string
  let groupMatchIds: string[]

  if (phase === "groups") {
    const matchday = computeMatchday(matchId, phaseMatches)
    bonusKey = `groups_fecha_${matchday}`
    // Determine which matches belong to this matchday using the same clustering
    const matchdayMap = new Map<string, number>()
    const byGroup = new Map<string, typeof phaseMatches>()
    for (const m of phaseMatches) {
      const g = m.group_name ?? "__"
      if (!byGroup.has(g)) byGroup.set(g, [])
      byGroup.get(g)!.push(m)
    }
    for (const gMatches of byGroup.values()) {
      const sorted = [...gMatches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      let fecha = 1
      let prevTime: number | null = null
      for (const m of sorted) {
        const t = new Date(m.match_date).getTime()
        if (prevTime !== null && t - prevTime > 48 * 3600 * 1000) fecha++
        matchdayMap.set(m.id, fecha)
        prevTime = t
      }
    }
    groupMatchIds = phaseMatches.filter((m: any) => matchdayMap.get(m.id) === matchday).map((m: any) => m.id)
  } else {
    bonusKey = phase
    groupMatchIds = phaseMatches.map((m: any) => m.id)
  }

  // Check all matches in this group are finished
  const groupStatuses = phaseMatches.filter((m: any) => groupMatchIds.includes(m.id))
  if (!groupStatuses.every((m: any) => m.status === "finished")) return

  // Get all pronos for this competition
  const { data: pronos } = await supabase
    .from("pronos")
    .select("id")
    .eq("competition_id", competitionId)
  if (!pronos?.length) return

  const pronoIds = pronos.map((p: any) => p.id)

  // Get all prono members
  const { data: members } = await supabase
    .from("prono_members")
    .select("user_id, prono_id, coins_in_prono")
    .in("prono_id", pronoIds)
  if (!members?.length) return

  // Build bonus label — used for dedup and display
  const label = phase === "groups"
    ? `Fecha ${bonusKey.split("_").pop()} completa · ${PHASE_LABELS.groups}`
    : `${PHASE_LABELS[phase] ?? phase} completo`

  // Get existing phase bonuses to avoid duplicates
  const { data: existing } = await supabase
    .from("coin_transactions")
    .select("user_id, prono_id")
    .eq("competition_id", competitionId)
    .eq("type", "phase_bonus")
    .eq("reason", label)
  const alreadyAwarded = new Set((existing ?? []).map((e: any) => `${e.user_id}:${e.prono_id}`))

  // Get predictions for this group of matches
  const { data: preds } = await supabase
    .from("predictions")
    .select("user_id, match_id")
    .eq("competition_id", competitionId)
    .in("match_id", groupMatchIds)

  const predsByUser = new Map<string, Set<string>>()
  for (const p of preds ?? []) {
    if (!predsByUser.has(p.user_id)) predsByUser.set(p.user_id, new Set())
    predsByUser.get(p.user_id)!.add(p.match_id)
  }

  // Award bonus to eligible members
  const toAward = members.filter((m: any) => {
    if (alreadyAwarded.has(`${m.user_id}:${m.prono_id}`)) return false
    const userPreds = predsByUser.get(m.user_id)
    return groupMatchIds.every((id: string) => userPreds?.has(id))
  })

  if (!toAward.length) return

  await supabase.from("coin_transactions").insert(
    toAward.map((m: any) => ({
      user_id: m.user_id,
      prono_id: m.prono_id,
      competition_id: competitionId,
      amount: 10,
      type: "phase_bonus",
      reason: label,
    }))
  )

  // Update coins_in_prono for each recipient
  for (const m of toAward) {
    await supabase
      .from("prono_members")
      .update({ coins_in_prono: m.coins_in_prono + 10 })
      .eq("user_id", m.user_id)
      .eq("prono_id", m.prono_id)
  }
}

async function awardMatchdayWinner(supabase: any, matchId: string) {
  const { data: match } = await supabase
    .from("matches")
    .select("competition_id, phase, match_date, group_name")
    .eq("id", matchId)
    .single()
  if (!match || match.phase === "final") return

  const { competition_id: competitionId, phase } = match

  // Fetch all matches in this phase
  const { data: phaseMatches } = await supabase
    .from("matches")
    .select("id, status, match_date, group_name")
    .eq("competition_id", competitionId)
    .eq("phase", phase)
  if (!phaseMatches?.length) return

  // Determine which match group we're in (matchday for groups, full phase for knockout)
  let groupMatchIds: string[]
  let winnerLabel: string

  if (phase === "groups") {
    const matchday = computeMatchday(matchId, phaseMatches)
    // Build full matchday map to get all match IDs for this fecha
    const matchdayMap = new Map<string, number>()
    const byGroup = new Map<string, typeof phaseMatches>()
    for (const m of phaseMatches) {
      const g = m.group_name ?? "__"
      if (!byGroup.has(g)) byGroup.set(g, [])
      byGroup.get(g)!.push(m)
    }
    for (const gMatches of byGroup.values()) {
      const sorted = [...gMatches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      let fecha = 1
      let prevTime: number | null = null
      for (const m of sorted) {
        const t = new Date(m.match_date).getTime()
        if (prevTime !== null && t - prevTime > 48 * 3600 * 1000) fecha++
        matchdayMap.set(m.id, fecha)
        prevTime = t
      }
    }
    groupMatchIds = phaseMatches.filter((m: any) => matchdayMap.get(m.id) === matchday).map((m: any) => m.id)
    winnerLabel = `Mejor predictor · Fecha ${matchday}`
  } else {
    groupMatchIds = phaseMatches.map((m: any) => m.id)
    winnerLabel = `Mejor predictor · ${PHASE_LABELS[phase] ?? phase}`
  }

  // Check all matches in this group are finished
  const groupMatches = phaseMatches.filter((m: any) => groupMatchIds.includes(m.id))
  if (!groupMatches.every((m: any) => m.status === "finished")) return

  // Check not already awarded (use prono_id = null as global dedup key since winner is same across pronos)
  const { data: existing } = await supabase
    .from("coin_transactions")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("type", "matchday_winner")
    .eq("reason", winnerLabel)
    .limit(1)
  if (existing?.length) return

  // Get points earned per user for this group of matches
  const { data: preds } = await supabase
    .from("predictions")
    .select("user_id, points_earned")
    .eq("competition_id", competitionId)
    .in("match_id", groupMatchIds)

  const pointsByUser = new Map<string, number>()
  for (const p of preds ?? []) {
    if (p.points_earned == null) continue
    pointsByUser.set(p.user_id, (pointsByUser.get(p.user_id) ?? 0) + p.points_earned)
  }
  if (!pointsByUser.size) return

  const maxPoints = Math.max(...pointsByUser.values())
  if (maxPoints === 0) return
  const winnerIds = new Set([...pointsByUser.entries()].filter(([, pts]) => pts === maxPoints).map(([id]) => id))

  // Get all prono members that are winners
  const { data: pronos } = await supabase
    .from("pronos").select("id").eq("competition_id", competitionId)
  if (!pronos?.length) return

  const { data: members } = await supabase
    .from("prono_members")
    .select("user_id, prono_id, coins_in_prono")
    .in("prono_id", pronos.map((p: any) => p.id))
    .in("user_id", [...winnerIds])

  if (!members?.length) return

  await supabase.from("coin_transactions").insert(
    members.map((m: any) => ({
      user_id: m.user_id,
      prono_id: m.prono_id,
      competition_id: competitionId,
      amount: 15,
      type: "matchday_winner",
      reason: winnerLabel,
    }))
  )

  for (const m of members) {
    await supabase
      .from("prono_members")
      .update({ coins_in_prono: m.coins_in_prono + 15 })
      .eq("user_id", m.user_id)
      .eq("prono_id", m.prono_id)
  }
}

async function autoScoreChampion(supabase: any, matchId: string, homeScore: number, awayScore: number) {
  const { data: match } = await supabase
    .from("matches")
    .select("competition_id, home_team, away_team, phase")
    .eq("id", matchId)
    .single()
  if (!match || match.phase !== "final") return
  if (homeScore === awayScore) return // Penalties — admin must score manually

  const champion = homeScore > awayScore ? match.home_team : match.away_team
  await scoreSpecialPredictionType(supabase, match.competition_id, "champion", champion)
}

// Exported so admin can call it for top_scorer and golden_ball
export async function scoreSpecialPredictions({
  competitionId, type, correctValue,
}: {
  competitionId: string
  type: "champion" | "top_scorer" | "golden_ball"
  correctValue: string
}) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error }
  await scoreSpecialPredictionType(supabase, competitionId, type, correctValue)
  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
}

async function scoreSpecialPredictionType(supabase: any, competitionId: string, type: string, correctValue: string) {
  const pts = type === "champion" ? 10 : 8

  // Persist the official answer on the competition so the public view can show it
  const { data: comp } = await supabase.from("competitions").select("official_answers").eq("id", competitionId).single()
  await supabase.from("competitions").update({
    official_answers: { ...(comp?.official_answers ?? {}), [type]: correctValue },
  }).eq("id", competitionId)

  // Find all predictions for this type — reset first to allow re-scoring
  const { data: allPreds } = await supabase
    .from("special_predictions")
    .select("id, user_id, value, points_earned")
    .eq("competition_id", competitionId)
    .eq("type", type)
  if (!allPreds?.length) return

  for (const pred of allPreds) {
    const earned = isNameMatch(pred.value, correctValue) ? pts : 0
    if (pred.points_earned === earned) continue // nothing changed

    await supabase
      .from("special_predictions")
      .update({ points_earned: earned })
      .eq("id", pred.id)

    const delta = earned - (pred.points_earned ?? 0)
    if (delta === 0) continue

    // Update competition_participants
    const { data: cp } = await supabase
      .from("competition_participants")
      .select("total_points")
      .eq("user_id", pred.user_id)
      .eq("competition_id", competitionId)
      .single()
    if (cp) {
      await supabase
        .from("competition_participants")
        .update({ total_points: cp.total_points + delta })
        .eq("user_id", pred.user_id)
        .eq("competition_id", competitionId)
    }

    // Update prono_members for all pronos in this competition
    const { data: pronoMembers } = await supabase
      .from("prono_members")
      .select("prono_id, total_points")
      .eq("user_id", pred.user_id)
      .in("prono_id",
        (await supabase.from("pronos").select("id").eq("competition_id", competitionId)).data?.map((p: any) => p.id) ?? []
      )

    for (const pm of pronoMembers ?? []) {
      await supabase
        .from("prono_members")
        .update({ total_points: pm.total_points + delta })
        .eq("user_id", pred.user_id)
        .eq("prono_id", pm.prono_id)
    }
  }
}
