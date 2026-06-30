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

  if (!member) return { error: "No eres miembro de este prono" }

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
    .select("id, match_date, status, competition_id, phase")
    .eq("id", matchId)
    .single()

  if (!match) return { error: "Partido no encontrado" }
  if (match.status !== "upcoming") return { error: "El partido ya comenzó" }

  // late_change / spy: must be bought at least 2 min before kick-off (user needs time to act on them)
  // wildcard / double_points: can be bought up to the exact kick-off time
  const matchTime = new Date(match.match_date)
  const lateDeadline = new Date(matchTime.getTime() - 2 * 60 * 1000)
  const now = new Date()

  if (type === "late_change" || type === "spy") {
    if (now > lateDeadline) return { error: "Ya pasó el plazo para este power-up" }
  } else {
    if (now >= matchTime) return { error: "Ya cerró el plazo para activar power-ups en este partido" }
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

  if (member.coins_in_prono < cost) return { error: "No tienes suficientes monedas" }

  // Wildcard phase restrictions
  if (type === "wildcard") {
    const disabledPhases = ["semifinals", "third_place", "final"]
    const limitedPhases = ["round_of_32", "round_of_16", "quarterfinals"]

    if (disabledPhases.includes(match.phase)) {
      return { error: "El Comodín no está disponible en esta fase del torneo" }
    }

    if (limitedPhases.includes(match.phase)) {
      // Fetch all matches in this phase to count wildcards used by this user
      const { data: phaseMatchIds } = await supabase
        .from("matches")
        .select("id")
        .eq("competition_id", match.competition_id)
        .eq("phase", match.phase)

      const ids = (phaseMatchIds ?? []).map((m: { id: string }) => m.id)

      if (ids.length > 0) {
        const { count } = await supabase
          .from("power_up_uses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("prono_id", pronoId)
          .eq("type", "wildcard")
          .in("match_id", ids)

        if ((count ?? 0) >= 1) {
          return { error: "Ya usaste el Comodín en esta fase. Solo se permite 1 por ronda eliminatoria." }
        }
      }
    }
  }

  // Double points phase restriction: 1 per knockout round
  if (type === "double_points" && match.phase !== "groups") {
    const { data: phaseMatchIds } = await supabase
      .from("matches")
      .select("id")
      .eq("competition_id", match.competition_id)
      .eq("phase", match.phase)

    const ids = (phaseMatchIds ?? []).map((m: { id: string }) => m.id)

    if (ids.length > 0) {
      const { count } = await supabase
        .from("power_up_uses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("prono_id", pronoId)
        .eq("type", "double_points")
        .in("match_id", ids)

      if ((count ?? 0) >= 1) {
        return { error: "Ya usaste Doble puntos en esta fase. Solo se permite 1 por ronda eliminatoria." }
      }
    }
  }

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

  // late_change: blocked if spy already active for this match (spy includes late_change benefit)
  if (type === "late_change") {
    const { data: spyUse } = await supabase
      .from("power_up_uses")
      .select("id")
      .eq("user_id", user.id)
      .eq("prono_id", pronoId)
      .eq("match_id", matchId)
      .eq("type", "spy")
      .maybeSingle()

    if (spyUse) return { error: "Ya tienes Espía activo, que incluye el beneficio del Cambio tardío" }

    const { count } = await supabase
      .from("power_up_uses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("prono_id", pronoId)
      .eq("type", "late_change")

    if ((count ?? 0) >= 8) return { error: "Ya usaste el máximo de cambios tardíos en este prono (8)" }
  }

  // spy: target_user_id required and must be a prono member
  if (type === "spy") {
    if (!targetUserId) return { error: "Tienes que elegir un rival para espiar" }
    if (targetUserId === user.id) return { error: "No puedes espiarte a ti mismo" }

    const { data: target } = await supabase
      .from("prono_members")
      .select("id")
      .eq("prono_id", pronoId)
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (!target) return { error: "El rival elegido no es miembro de este prono" }
  }

  // Deduct coins + log transaction via SECURITY DEFINER RPC (bypasses RLS on prono_members)
  const { data: remaining, error: spendError } = await supabase.rpc("spend_coins_for_powerup", {
    p_user_id: user.id,
    p_prono_id: pronoId,
    p_match_id: matchId,
    p_type: type,
    p_amount: cost,
    p_competition_id: match.competition_id,
  })

  if (spendError) return { error: "Error al descontar monedas" }
  if (remaining === -1) return { error: "No tienes suficientes monedas" }

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
    await supabase.rpc("spend_coins_for_powerup", {
      p_user_id: user.id,
      p_prono_id: pronoId,
      p_match_id: matchId,
      p_type: type,
      p_amount: -cost,
      p_competition_id: match.competition_id,
    })
    return { error: "Error al activar power-up" }
  }

  revalidatePath(`/pronos/${pronoId}`)
  return { success: true, coinsRemaining: remaining }
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
