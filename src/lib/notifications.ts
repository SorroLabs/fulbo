import { createServiceClient } from "@/lib/supabase/service"

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

async function getWebPush() {
  const webpush = (await import("web-push")).default
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  return webpush
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = createServiceClient()
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (!subs?.length) return

  const webpush = await getWebPush()

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(() => {
        supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
      })
    )
  )
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)))
}
