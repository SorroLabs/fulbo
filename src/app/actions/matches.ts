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
