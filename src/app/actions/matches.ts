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

  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
}
