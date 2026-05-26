"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { POWER_UP_COSTS, type PowerUpType } from "@/types"

export async function activatePowerUp({
  pronoId,
  matchId,
  type,
  targetUserId,
}: {
  pronoId: string
  matchId: string
  type: PowerUpType
  targetUserId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Verify prono membership + get coin balance
  const { data: member } = await supabase
    .from("prono_members")
    .select("id, coins_in_prono")
    .eq("prono_id", pronoId)
    .eq("user_id", user.id)
    .single()

  if (!member) return { error: "No sos miembro de este prono" }

  // Verify prono has power-ups enabled
  const { data: prono } = await supabase
    .from("pronos")
    .select("power_ups_enabled, competition_id")
    .eq("id", pronoId)
    .single()

  if (!prono?.power_ups_enabled) return { error: "Los power-ups no están habilitados en este prono" }

  // Fetch match
  const { data: match } = await supabase
    .from("matches")
    .select("id, match_date, status, competition_id")
    .eq("id", matchId)
    .single()

  if (!match) return { error: "Partido no encontrado" }
  if (match.status !== "upcoming") return { error: "El partido ya comenzó" }

  // Deadline check: late_change can be bought up to 2 min before, others up to 20 min before
  const matchTime = new Date(match.match_date)
  const normalDeadline = new Date(matchTime.getTime() - 20 * 60 * 1000)
  const lateDeadline = new Date(matchTime.getTime() - 2 * 60 * 1000)
  const now = new Date()

  // spy implicitly includes late edit, so its purchase window is also 2 min before
  if (type === "late_change" || type === "spy") {
    if (now > lateDeadline) return { error: "Ya pasó el plazo para este power-up" }
  } else {
    if (now > normalDeadline) return { error: "Ya cerró el plazo para activar power-ups en este partido" }
  }

  // Get effective cost (prono config overrides default)
  const { data: config } = await supabase
    .from("prono_powerup_config")
    .select("cost, enabled")
    .eq("prono_id", pronoId)
    .eq("type", type)
    .maybeSingle()

  if (config && !config.enabled) return { error: "Este power-up no está disponible en este prono" }

  const cost = config?.cost ?? POWER_UP_COSTS[type]

  if (member.coins_in_prono < cost) return { error: "No tenés suficientes monedas" }

  // Check already activated for this match
  const { data: existing } = await supabase
    .from("power_up_uses")
    .select("id")
    .eq("user_id", user.id)
    .eq("prono_id", pronoId)
    .eq("match_id", matchId)
    .eq("type", type)
    .maybeSingle()

  if (existing) return { error: "Ya activaste este power-up para este partido" }

  // late_change: max 3 per prono
  if (type === "late_change") {
    const { count } = await supabase
      .from("power_up_uses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("prono_id", pronoId)
      .eq("type", "late_change")

    if ((count ?? 0) >= 3) return { error: "Ya usaste el máximo de cambios tardíos en este prono (3)" }
  }

  // spy: target_user_id required and must be a prono member
  if (type === "spy") {
    if (!targetUserId) return { error: "Tenés que elegir un rival para espiar" }
    if (targetUserId === user.id) return { error: "No podés espiarte a vos mismo" }

    const { data: target } = await supabase
      .from("prono_members")
      .select("id")
      .eq("prono_id", pronoId)
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (!target) return { error: "El rival elegido no es miembro de este prono" }
  }

  // Deduct coins
  const { error: deductError } = await supabase
    .from("prono_members")
    .update({ coins_in_prono: member.coins_in_prono - cost })
    .eq("id", member.id)

  if (deductError) return { error: "Error al descontar monedas" }

  // Insert power-up use
  const { error: insertError } = await supabase
    .from("power_up_uses")
    .insert({
      user_id: user.id,
      prono_id: pronoId,
      match_id: matchId,
      type,
      coins_spent: cost,
      target_user_id: targetUserId ?? null,
    })

  if (insertError) {
    // Rollback coin deduction
    await supabase
      .from("prono_members")
      .update({ coins_in_prono: member.coins_in_prono })
      .eq("id", member.id)
    return { error: "Error al activar power-up" }
  }

  // Log transaction
  await supabase.from("coin_transactions").insert({
    user_id: user.id,
    amount: cost,
    type: "spend",
    reason: `Power-up: ${type}`,
    competition_id: match.competition_id,
    match_id: matchId,
    prono_id: pronoId,
  })

  revalidatePath(`/pronos/${pronoId}`)
  return { success: true, coinsRemaining: member.coins_in_prono - cost }
}

export async function getMyPowerUps({
  pronoId,
  matchId,
}: {
  pronoId: string
  matchId: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  const { data } = await supabase
    .from("power_up_uses")
    .select("*")
    .eq("user_id", user.id)
    .eq("prono_id", pronoId)
    .eq("match_id", matchId)

  return { data: data ?? [] }
}

export async function getPronoConfig(pronoId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("prono_powerup_config")
    .select("*")
    .eq("prono_id", pronoId)

  return { data: data ?? [] }
}

export async function updatePronoConfig({
  pronoId,
  type,
  cost,
  enabled,
}: {
  pronoId: string
  type: PowerUpType
  cost: number
  enabled: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: prono } = await supabase
    .from("pronos")
    .select("owner_id")
    .eq("id", pronoId)
    .single()

  if (prono?.owner_id !== user.id) return { error: "Solo el dueño del prono puede configurar power-ups" }

  const { error } = await supabase
    .from("prono_powerup_config")
    .upsert({ prono_id: pronoId, type, cost, enabled }, { onConflict: "prono_id,type" })

  if (error) return { error: error.message }

  revalidatePath(`/pronos/${pronoId}`)
  return { success: true }
}
