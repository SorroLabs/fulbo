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
  isAuto,
}: {
  userId: string
  matchId: string
  competitionId: string
  pronoId: string
  homeScore: number
  awayScore: number
  isAuto?: boolean
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

  // Check if user has late_change or spy (extends deadline to 2 min before)
  const { data: latePU } = await supabase
    .from("power_up_uses")
    .select("id")
    .eq("user_id", userId)
    .eq("prono_id", pronoId)
    .eq("match_id", matchId)
    .in("type", ["late_change", "spy"])
    .maybeSingle()

  const minutesBefore = latePU ? 2 : 20
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - minutesBefore)
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
    ...(isAuto !== undefined ? { is_auto: isAuto } : {}),
  }, { onConflict: "user_id,prono_id,match_id" })

  if (error) return { error: "Error al guardar la predicción" }
  revalidatePath(`/pronos`)
  return { success: true }
}

export async function fillRandomPredictions({
  userId,
  pronoId,
  matchIds,
}: {
  userId: string
  pronoId: string
  matchIds: string[]
}): Promise<{ filled: number; skipped: number; error?: string }> {
  const supabase = await createClient()

  const [{ data: matchesData }, { data: existingPreds }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, status, match_date, competition_id")
      .in("id", matchIds),
    supabase
      .from("predictions")
      .select("match_id")
      .eq("user_id", userId)
      .eq("prono_id", pronoId)
      .in("match_id", matchIds),
  ])

  if (!matchesData) return { filled: 0, skipped: matchIds.length }

  const existingMatchIds = new Set((existingPreds ?? []).map((p: { match_id: string }) => p.match_id))
  const now = new Date()
  const rows: Array<{
    user_id: string; match_id: string; competition_id: string; prono_id: string
    home_score: number; away_score: number; is_auto: boolean; updated_at: string
  }> = []
  let skipped = 0

  for (const match of matchesData) {
    if (existingMatchIds.has(match.id)) { skipped++; continue }
    if (match.status !== "upcoming") { skipped++; continue }
    const deadline = new Date(match.match_date)
    deadline.setMinutes(deadline.getMinutes() - 20)
    if (now > deadline) { skipped++; continue }

    rows.push({
      user_id: userId,
      match_id: match.id,
      competition_id: match.competition_id,
      prono_id: pronoId,
      home_score: Math.floor(Math.random() * 6),
      away_score: Math.floor(Math.random() * 6),
      is_auto: true,
      updated_at: new Date().toISOString(),
    })
  }

  if (rows.length === 0) return { filled: 0, skipped }

  const { error } = await supabase
    .from("predictions")
    .upsert(rows, { onConflict: "user_id,prono_id,match_id" })

  if (error) return { filled: 0, skipped: matchIds.length, error: "Error al guardar predicciones" }

  revalidatePath("/pronos")
  return { filled: rows.length, skipped }
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
