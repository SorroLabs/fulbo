"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function assertAdmin(supabase: any, adminId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", adminId).single()
  if (data?.role !== "admin") throw new Error("No autorizado")
}

export async function approveParticipant({
  participantId, userId, coins, adminId,
}: {
  participantId: string
  userId: string
  coins: number
  adminId: string
}) {
  const supabase = await createClient()
  try { await assertAdmin(supabase, adminId) } catch { return { error: "No autorizado" } }

  const { error } = await supabase
    .from("competition_participants")
    .update({ status: "approved", approved_by: adminId, approved_at: new Date().toISOString() })
    .eq("id", participantId)

  if (error) return { error: "Error al aprobar" }

  // Grant coins
  if (coins > 0) {
    const { data: participant } = await supabase
      .from("competition_participants")
      .select("competition_id")
      .eq("id", participantId)
      .single()

    await supabase.from("coin_transactions").insert({
      user_id: userId,
      amount: coins,
      type: "admin_grant",
      reason: `Inscripción aprobada — ${coins} monedas iniciales`,
      competition_id: participant?.competition_id,
    })
    await supabase.rpc("increment_profile_coins", { uid: userId, amount: coins })
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function rejectParticipant({ participantId, adminId }: { participantId: string; adminId: string }) {
  const supabase = await createClient()
  try { await assertAdmin(supabase, adminId) } catch { return { error: "No autorizado" } }

  const { error } = await supabase
    .from("competition_participants")
    .update({ status: "rejected", approved_by: adminId, approved_at: new Date().toISOString() })
    .eq("id", participantId)

  if (error) return { error: "Error al rechazar" }
  revalidatePath("/admin")
  return { success: true }
}

export async function updateCompetitionStatus({ competitionId, status }: {
  competitionId: string
  status: "upcoming" | "active" | "finished"
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { error: "No autorizado" }

  const { error } = await supabase
    .from("competitions")
    .update({ status })
    .eq("id", competitionId)

  if (error) return { error: "Error al actualizar el estado" }
  revalidatePath("/admin")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function grantCoins({ userId, amount, reason, adminId }: {
  userId: string
  amount: number
  reason: string
  adminId: string
}) {
  const supabase = await createClient()
  try { await assertAdmin(supabase, adminId) } catch { return { error: "No autorizado" } }

  await supabase.from("coin_transactions").insert({ user_id: userId, amount, type: "admin_grant", reason })
  await supabase.rpc("increment_profile_coins", { uid: userId, amount })
  return { success: true }
}
