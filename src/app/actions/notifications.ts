"use server"

import { createClient } from "@/lib/supabase/server"

export async function subscribePush(subscription: {
  endpoint: string
  p256dh: string
  auth: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, ...subscription },
    { onConflict: "user_id,endpoint" }
  )
  if (error) return { error: error.message }
  return { success: true }
}

export async function unsubscribePush(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  await supabase.from("push_subscriptions").delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)
  return { success: true }
}

export async function getMySubscription() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("push_subscriptions").select("endpoint").eq("user_id", user.id).limit(1).single()
  return data?.endpoint ?? null
}
