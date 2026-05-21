"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createProno({
  userId,
  competitionId,
  name,
  description,
  isPublic,
}: {
  userId: string
  competitionId: string
  name: string
  description: string
  isPublic: boolean
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pronos")
    .insert({ owner_id: userId, competition_id: competitionId, name, description, is_public: isPublic })
    .select()
    .single()

  if (error) return { error: "Error al crear el prono" }

  // Auto-join creator
  await supabase.from("prono_members").insert({ prono_id: data.id, user_id: userId })
  revalidatePath("/pronos")
  return { data }
}

export async function joinProno({ userId, pronoId }: { userId: string; pronoId: string }) {
  const supabase = await createClient()

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
    .insert({ prono_id: pronoId, user_id: userId })

  if (error?.code === "23505") return { error: "Ya sos miembro de este prono" }
  if (error) return { error: "Error al unirse al prono" }

  revalidatePath("/pronos")
  revalidatePath(`/pronos/${pronoId}`)
  return { success: true }
}

export async function joinPronoByCode({ userId, code }: { userId: string; code: string }) {
  const supabase = await createClient()
  const { data: prono } = await supabase
    .from("pronos")
    .select("id")
    .eq("invite_code", code.toUpperCase())
    .single()

  if (!prono) return { error: "Código de invitación inválido" }
  return joinProno({ userId, pronoId: prono.id })
}
