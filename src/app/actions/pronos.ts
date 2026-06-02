"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"
import { sendPushToUser } from "@/lib/notifications"

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

export async function joinProno({ pronoId, referrerId }: { pronoId: string; referrerId?: string }) {
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

  if (error?.code === "23505") return { error: "Ya eres miembro de este prono" }
  if (error) return { error: "Error al unirse al prono" }

  // Award referral bonus — owner excluded, only non-owner members
  if (referrerId && referrerId !== user.id && referrerId !== prono.owner_id) {
    const { data: referrerMembership } = await supabase
      .from("prono_members")
      .select("coins_in_prono")
      .eq("prono_id", pronoId)
      .eq("user_id", referrerId)
      .single()

    if (referrerMembership) {
      await supabase
        .from("prono_members")
        .update({ coins_in_prono: referrerMembership.coins_in_prono + 10 })
        .eq("prono_id", pronoId)
        .eq("user_id", referrerId)

      await supabase.from("coin_transactions").insert({
        user_id: referrerId,
        prono_id: pronoId,
        amount: 10,
        type: "earn",
        reason: "Invitación aceptada",
      })
    }
  }

  // Notify prono owner
  if (prono.owner_id !== user.id) {
    const { data: joinerProfile } = await supabase.from("profiles").select("full_name, nickname").eq("id", user.id).single()
    const name = joinerProfile?.nickname ? `@${joinerProfile.nickname}` : (joinerProfile?.full_name ?? "Alguien")
    sendPushToUser(prono.owner_id, {
      title: `¡Nuevo miembro en ${prono.name}!`,
      body: `${name} se unió a tu prono.`,
      url: `/pronos/${prono.invite_code}`,
    }).catch(() => {})
  }

  revalidatePath("/pronos")
  revalidatePath(`/pronos/${prono.invite_code}`)
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
    .eq("invite_code", code.trim().toUpperCase())
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

export async function toggleCoAdmin({ pronoId, userId, makeAdmin }: { pronoId: string; userId: string; makeAdmin: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: prono } = await supabase.from("pronos").select("owner_id").eq("id", pronoId).single()
  if (!prono || prono.owner_id !== user.id) return { error: "Solo el fundador puede gestionar co-admins" }
  if (userId === user.id) return { error: "No puedes cambiarte el rol a ti mismo" }

  const service = createServiceClient()
  const { error } = await service
    .from("prono_members")
    .update({ role: makeAdmin ? "admin" : "member" })
    .eq("prono_id", pronoId)
    .eq("user_id", userId)

  if (error) return { error: error.message }
  revalidatePath(`/pronos`)
  return { success: true }
}

export async function toggleMemberActive({ pronoId, userId, isActive }: { pronoId: string; userId: string; isActive: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const [{ data: prono }, { data: myMembership }] = await Promise.all([
    supabase.from("pronos").select("owner_id").eq("id", pronoId).single(),
    supabase.from("prono_members").select("role").eq("prono_id", pronoId).eq("user_id", user.id).single(),
  ])
  const canManage = prono?.owner_id === user.id || myMembership?.role === "admin"
  if (!canManage) return { error: "Sin permisos" }
  if (userId === user.id) return { error: "No puedes desactivarte a ti mismo" }

  const service = createServiceClient()
  const { error } = await service
    .from("prono_members")
    .update({ is_active: isActive })
    .eq("prono_id", pronoId)
    .eq("user_id", userId)

  if (error) return { error: error.message }
  revalidatePath(`/pronos`)
  return { success: true }
}

export async function removeMember({ pronoId, userId }: { pronoId: string; userId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const [{ data: prono }, { data: myMembership }] = await Promise.all([
    supabase.from("pronos").select("owner_id").eq("id", pronoId).single(),
    supabase.from("prono_members").select("role").eq("prono_id", pronoId).eq("user_id", user.id).single(),
  ])
  const canManage = prono?.owner_id === user.id || myMembership?.role === "admin"
  if (!canManage) return { error: "Sin permisos" }
  if (userId === user.id) return { error: "No puedes removerte a ti mismo" }
  if (userId === prono?.owner_id) return { error: "No puedes eliminar al fundador" }

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
