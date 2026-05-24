"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function ensureWallet(supabase: any, userId: string, competitionId: string) {
  const { data: existing } = await supabase
    .from("competition_wallets")
    .select("id")
    .eq("user_id", userId)
    .eq("competition_id", competitionId)
    .single()

  if (!existing) {
    await supabase.from("competition_wallets").insert({
      user_id: userId,
      competition_id: competitionId,
      coins: 100,
    })
    await supabase.from("coin_transactions").insert({
      user_id: userId,
      competition_id: competitionId,
      amount: 100,
      type: "earn",
      reason: "Bienvenida a la competición",
    })
  }
}

export async function createProno({
  competitionId,
  name,
  description,
  isPublic,
  powerUpsEnabled,
}: {
  competitionId: string
  name: string
  description: string
  isPublic: boolean
  powerUpsEnabled: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data, error } = await supabase
    .from("pronos")
    .insert({ owner_id: user.id, competition_id: competitionId, name, description, is_public: isPublic, power_ups_enabled: powerUpsEnabled })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from("prono_members").insert({ prono_id: data.id, user_id: user.id })
  await ensureWallet(supabase, user.id, competitionId)
  revalidatePath("/pronos")
  return { data }
}

export async function joinProno({ pronoId }: { pronoId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: prono } = await supabase
    .from("pronos")
    .select("*, prono_members(count)")
    .eq("id", pronoId)
    .single()

  if (!prono) return { error: "Prono no encontrado" }

  const memberCount = (prono as any).prono_members?.[0]?.count ?? 0
  if (memberCount >= prono.max_members) return { error: "El prono está lleno" }

  const { error } = await supabase
    .from("prono_members")
    .insert({ prono_id: pronoId, user_id: user.id })

  if (error?.code === "23505") return { error: "Ya sos miembro de este prono" }
  if (error) return { error: "Error al unirse al prono" }

  await ensureWallet(supabase, user.id, prono.competition_id)
  revalidatePath("/pronos")
  revalidatePath(`/pronos/${pronoId}`)
  return { success: true }
}

export async function joinPronoByCode({ code }: { code: string }) {
  const supabase = await createClient()
  const { data: prono } = await supabase
    .from("pronos")
    .select("id")
    .eq("invite_code", code.toUpperCase())
    .single()

  if (!prono) return { error: "Código de invitación inválido" }
  return joinProno({ pronoId: prono.id })
}
