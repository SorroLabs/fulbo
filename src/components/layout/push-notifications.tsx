"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { subscribePush, unsubscribePush } from "@/app/actions/notifications"
import { toast } from "sonner"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function PushNotificationsToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    setSupported(true)
    navigator.serviceWorker.register("/sw.js").then(async () => {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  if (!supported) return null

  async function handleToggle() {
    setLoading(true)
    try {
      if (subscribed) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await unsubscribePush(sub.endpoint)
          await sub.unsubscribe()
        }
        setSubscribed(false)
        toast.success("Notificaciones desactivadas")
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
          toast.error("Permiso denegado. Actívalo desde la configuración del navegador.")
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
        const json = sub.toJSON()
        const keys = json.keys as { p256dh: string; auth: string }
        await subscribePush({ endpoint: json.endpoint!, p256dh: keys.p256dh, auth: keys.auth })
        setSubscribed(true)
        toast.success("¡Notificaciones activadas!")
      }
    } catch {
      toast.error("No se pudo cambiar las notificaciones")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      title={subscribed ? "Desactivar notificaciones" : "Activar notificaciones"}
      className="h-9 w-9"
    >
      {subscribed
        ? <Bell className="h-4 w-4 text-primary" />
        : <BellOff className="h-4 w-4 text-muted-foreground" />
      }
    </Button>
  )
}
