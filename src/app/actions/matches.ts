"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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

  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
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

  // Global snapshot from competition_participants
  const { data: participants } = await supabase
    .from("competition_participants")
    .select("user_id, total_points, profiles(full_name, nickname)")
    .eq("competition_id", competitionId)
    .order("total_points", { ascending: false })

  if (participants?.length) {
    await supabase.from("leaderboard_snapshots").insert({
      competition_id: competitionId,
      prono_id: null,
      match_id: matchId,
      snapshot_data: participants.map((p: any, i: number) => ({
        user_id: p.user_id,
        full_name: p.profiles?.nickname ?? p.profiles?.full_name ?? "Usuario",
        total_points: p.total_points,
        rank: i + 1,
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
