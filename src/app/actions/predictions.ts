"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function savePrediction({
  userId,
  matchId,
  competitionId,
  homeScore,
  awayScore,
}: {
  userId: string
  matchId: string
  competitionId: string
  homeScore: number
  awayScore: number
}) {
  const supabase = await createClient()

  // Check deadline: match must still be upcoming and 10+ min away
  const { data: match } = await supabase
    .from("matches")
    .select("status, match_date")
    .eq("id", matchId)
    .single()

  if (!match || match.status !== "upcoming") {
    return { error: "No se puede predecir este partido" }
  }

  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - 10)
  if (new Date() > deadline) {
    return { error: "El plazo para predecir este partido ya cerró" }
  }

  const { error } = await supabase.from("predictions").upsert({
    user_id: userId,
    match_id: matchId,
    competition_id: competitionId,
    home_score: homeScore,
    away_score: awayScore,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,match_id" })

  if (error) return { error: "Error al guardar la predicción" }

  // First prediction bonus
  const { count } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("competition_id", competitionId)

  if (count === 1) {
    await supabase.from("coin_transactions").insert({
      user_id: userId,
      amount: 5,
      type: "earn",
      reason: "Primera predicción cargada",
      competition_id: competitionId,
    })
    await supabase.from("profiles").update({ coins: supabase.rpc("increment_coins", { uid: userId, amount: 5 }) }).eq("id", userId)
  }

  return { success: true }
}

export async function saveSpecialPrediction({
  userId,
  competitionId,
  type,
  value,
}: {
  userId: string
  competitionId: string
  type: "champion" | "top_scorer" | "golden_ball"
  value: string
}) {
  const supabase = await createClient()

  const { data: competition } = await supabase
    .from("competitions")
    .select("status")
    .eq("id", competitionId)
    .single()

  if (!competition || competition.status !== "upcoming") {
    return { error: "Las predicciones especiales ya no se pueden modificar" }
  }

  const { error } = await supabase.from("special_predictions").upsert({
    user_id: userId,
    competition_id: competitionId,
    type,
    value,
  }, { onConflict: "user_id,competition_id,type" })

  if (error) return { error: "Error al guardar la predicción especial" }
  revalidatePath("/", "layout")
  return { success: true }
}
