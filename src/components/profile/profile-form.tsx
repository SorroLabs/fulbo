"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Check, X, Loader2, MapPin } from "lucide-react"
import { updateProfile, checkNickname } from "@/app/actions/profile"
import { createClient } from "@/lib/supabase/client"
import { TIMEZONES, detectTimezone } from "@/lib/timezones"
import { toast } from "sonner"
import type { Profile } from "@/types"

interface Props {
  profile: Profile
  isSetup?: boolean
}

export function ProfileForm({ profile, isSetup }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState(profile.nickname ?? "")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [timezone, setTimezone] = useState(profile.timezone || "America/Bogota")
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [isPending, startTransition] = useTransition()

  // Auto-detect timezone if not set
  useEffect(() => {
    if (!profile.timezone) setTimezone(detectTimezone())
  }, [profile.timezone])

  // Debounced nickname check
  useEffect(() => {
    if (nickname === profile.nickname) { setNicknameStatus("idle"); return }
    if (nickname.length < 3) { setNicknameStatus(nickname.length > 0 ? "invalid" : "idle"); return }
    setNicknameStatus("checking")
    const t = setTimeout(async () => {
      const res = await checkNickname(nickname)
      setNicknameStatus(res.available ? "available" : "taken")
    }, 500)
    return () => clearTimeout(t)
  }, [nickname, profile.nickname])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error("La foto no puede superar 2 MB"); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return null
    const supabase = createClient()
    const ext = avatarFile.name.split(".").pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true })
    if (error) { toast.error("Error subiendo la foto"); return null }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    return data.publicUrl
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    if (nicknameStatus === "taken") { toast.error("Ese nickname ya está en uso"); return }
    startTransition(async () => {
      const avatarUrl = await uploadAvatar()
      const res = await updateProfile({ nickname, timezone, ...(avatarUrl ? { avatarUrl } : {}) })
      if (res.error) toast.error(res.error)
      else {
        toast.success(isSetup ? "¡Perfil configurado!" : "Perfil actualizado")
        router.push(isSetup ? "/dashboard" : "/settings")
        router.refresh()
      }
    })
  }

  const initials = (profile.full_name ?? profile.email)
    .split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

  const nicknameIcon = {
    idle: null,
    checking: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
    available: <Check className="h-4 w-4 text-emerald-500" />,
    taken: <X className="h-4 w-4 text-destructive" />,
    invalid: null,
  }[nicknameStatus]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isSetup && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary font-medium">
          Antes de continuar, elige un nickname para tu perfil.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={avatarPreview ?? undefined} />
                <AvatarFallback className="text-2xl font-black bg-primary/20 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">JPG o PNG, máx. 2 MB</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Full name (read-only, from Google) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Nombre (desde Google)</Label>
            <Input value={profile.full_name ?? ""} disabled className="rounded-xl opacity-60" />
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <Label>Nickname *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={nickname}
                onChange={e => setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="tu_nick"
                className="rounded-xl pl-7 pr-9"
                maxLength={20}
                required
              />
              {nicknameIcon && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">{nicknameIcon}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {nicknameStatus === "taken" && <span className="text-destructive">Ese nickname ya está en uso</span>}
              {nicknameStatus === "available" && <span className="text-emerald-500">¡Disponible!</span>}
              {nicknameStatus === "invalid" && <span className="text-muted-foreground">Mínimo 3 caracteres (letras, números y _)</span>}
              {nicknameStatus === "idle" && "Solo letras minúsculas, números y guion bajo"}
            </p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Zona horaria
            </Label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
            >
              {/* Show detected timezone first if not in list */}
              {!TIMEZONES.find(t => t.value === timezone) && (
                <option value={timezone}>{timezone} (detectada)</option>
              )}
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Los horarios de los partidos se mostrarán en esta zona</p>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isPending || !nickname.trim() || nicknameStatus === "taken" || nicknameStatus === "checking"}
        className="w-full h-12 rounded-xl text-base font-bold"
      >
        {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...</> : isSetup ? "Empezar a jugar" : "Guardar cambios"}
      </Button>
    </form>
  )
}
