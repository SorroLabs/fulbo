"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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

  await supabase.from("prono_members").insert({ prono_id: data.id, user_id: user.id, coins_in_prono: 100 })
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
    .insert({ prono_id: pronoId, user_id: user.id, coins_in_prono: 100 })

  if (error?.code === "23505") return { error: "Ya sos miembro de este prono" }
  if (error) return { error: "Error al unirse al prono" }

  revalidatePath("/pronos")
  revalidatePath(`/pronos/${pronoId}`)
  return { success: true }
}

export async function togglePronoVisibility({ pronoId, isPublic }: { pronoId: string; isPublic: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("pronos")
    .update({ is_public: isPublic })
    .eq("id", pronoId)
    .eq("owner_id", user.id)

  if (error) return { error: error.message }

  revalidatePath(`/pronos`)
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

export async function updatePronoSettings({
  pronoId,
  name,
  description,
  maxMembers,
}: {
  pronoId: string
  name: string
  description: string
  maxMembers: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("pronos")
    .update({ name: name.trim(), description: description.trim(), max_members: maxMembers })
    .eq("id", pronoId)
    .eq("owner_id", user.id)

  if (error) return { error: error.message }

  revalidatePath(`/pronos`)
  return { success: true }
}

export async function removeMember({ pronoId, userId }: { pronoId: string; userId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: prono } = await supabase
    .from("pronos")
    .select("owner_id")
    .eq("id", pronoId)
    .single()

  if (!prono || prono.owner_id !== user.id) return { error: "Sin permisos" }
  if (userId === user.id) return { error: "No podés removerte a vos mismo" }

  const { error } = await supabase
    .from("prono_members")
    .delete()
    .eq("prono_id", pronoId)
    .eq("user_id", userId)

  if (error) return { error: error.message }

  revalidatePath(`/pronos`)
  return { success: true }
}

export async function deleteProno({ pronoId }: { pronoId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("pronos")
    .delete()
    .eq("id", pronoId)
    .eq("owner_id", user.id)

  if (error) return { error: error.message }

  revalidatePath(`/pronos`)
  return { success: true }
}
