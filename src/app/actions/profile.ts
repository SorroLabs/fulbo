"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile({
  nickname,
  avatarUrl,
  timezone,
}: {
  nickname: string
  avatarUrl?: string
  timezone: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const clean = nickname.trim().toLowerCase().replace(/[^a-z0-9_]/g, "")
  if (clean.length < 3) return { error: "El nickname debe tener al menos 3 caracteres" }
  if (clean.length > 20) return { error: "El nickname no puede superar 20 caracteres" }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", clean)
    .neq("id", user.id)
    .single()

  if (existing) return { error: "Ese nickname ya está en uso" }

  const updates: any = { nickname: clean, timezone }
  if (avatarUrl) updates.avatar_url = avatarUrl

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)
  if (error) return { error: error.message }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function checkNickname(nickname: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const clean = nickname.trim().toLowerCase().replace(/[^a-z0-9_]/g, "")
  if (clean.length < 3) return { available: false }
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", clean)
    .neq("id", user?.id ?? "")
    .single()
  return { available: !data, clean }
}
