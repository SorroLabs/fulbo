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

export function PushNotificationsToggle({ initialEndpoint }: { initialEndpoint: string | null }) {
  const [endpoint, setEndpoint] = useState<string | null>(initialEndpoint)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window)
  }, [])

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [supported])

  if (!supported) return null

  async function handleToggle() {
    setLoading(true)
    try {
      if (endpoint) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        await sub?.unsubscribe()
        await unsubscribePush(endpoint)
        setEndpoint(null)
        toast.success("Notificaciones desactivadas")
      } else {
        // Subscribe
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
        setEndpoint(json.endpoint!)
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
      title={endpoint ? "Desactivar notificaciones" : "Activar notificaciones"}
      className="h-9 w-9 relative"
    >
      {endpoint ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}
