"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function savePrediction({
  userId,
  matchId,
  competitionId,
  pronoId,
  homeScore,
  awayScore,
}: {
  userId: string
  matchId: string
  competitionId: string
  pronoId: string
  homeScore: number
  awayScore: number
}) {
  const supabase = await createClient()

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
    prono_id: pronoId,
    home_score: homeScore,
    away_score: awayScore,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,prono_id,match_id" })

  if (error) return { error: "Error al guardar la predicción" }
  revalidatePath(`/pronos`)
  return { success: true }
}

export async function deletePrediction({
  userId,
  matchId,
  pronoId,
}: {
  userId: string
  matchId: string
  pronoId: string
}) {
  const supabase = await createClient()

  const { data: match } = await supabase
    .from("matches")
    .select("status, match_date")
    .eq("id", matchId)
    .single()

  if (!match || match.status !== "upcoming") {
    return { error: "No se puede modificar este partido" }
  }

  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - 10)
  if (new Date() > deadline) {
    return { error: "El plazo para predecir este partido ya cerró" }
  }

  await supabase.from("predictions")
    .delete()
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .eq("prono_id", pronoId)

  revalidatePath(`/pronos`)
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

  const { data: startedMatch } = await supabase
    .from("matches")
    .select("id")
    .eq("competition_id", competitionId)
    .in("status", ["live", "finished"])
    .limit(1)
    .maybeSingle()

  if (startedMatch) {
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
