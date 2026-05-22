"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function reportMatchResult({
  matchId,
  homeScore,
  awayScore,
}: {
  matchId: string
  homeScore: number
  awayScore: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { error: "Sin permisos" }

  const { error } = await supabase.from("matches").update({
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
