"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Globe, Lock, Zap, ZapOff, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { createProno } from "@/app/actions/pronos"
import { toast } from "sonner"

interface Props {
  competitions: { id: string; name: string; season: string; status: string }[]
}

export function CreatePronoForm({ competitions }: Props) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "")
  const [isPublic, setIsPublic] = useState(true)
  const [powerUpsEnabled, setPowerUpsEnabled] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [showPowerUpInfo, setShowPowerUpInfo] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !competitionId) return
    startTransition(async () => {
      const res = await createProno({ competitionId, name, description, isPublic, powerUpsEnabled })
      if (res.error) toast.error(res.error)
      else {
        toast.success("¡Prono creado!")
        router.push(`/pronos/${res.data!.invite_code}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label>Nombre del prono *</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Los pibes del laburo"
              className="rounded-xl"
              maxLength={60}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Solo para la familia..."
              className="rounded-xl"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label>Competición *</Label>
            <select
              value={competitionId}
              onChange={e => setCompetitionId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
              required
            >
              {competitions.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.season}</option>
              ))}
            </select>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Power-ups</Label>
              <button
                type="button"
                onClick={() => setShowPowerUpInfo(v => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPowerUpInfo ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
              </button>
            </div>
            {showPowerUpInfo && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 space-y-1 leading-relaxed">
                <p>Los power-ups permiten a los miembros usar sus monedas para activar ventajas en partidos concretos:</p>
                <ul className="space-y-0.5 pl-3">
                  <li>⚡ <strong>Doble puntos</strong> — duplica los puntos de un partido</li>
                  <li>🕐 <strong>Cambio tardío</strong> — editá hasta 2 min antes del partido</li>
                  <li>👁 <strong>Espía</strong> — mirá la predicción de otro miembro</li>
                  <li>🛡 <strong>Comodín</strong> — protege tu posición si errás</li>
                </ul>
                <p className="pt-0.5">Esta opción no se puede cambiar una vez creado el prono.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: true, label: "Con power-ups", desc: "Los miembros pueden usar monedas para ventajas", Icon: Zap },
                { value: false, label: "Sin power-ups", desc: "Competencia pura, solo predicciones", Icon: ZapOff },
              ].map(({ value, label, desc, Icon }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setPowerUpsEnabled(value)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all",
                    powerUpsEnabled === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Icon className="h-4 w-4" /> {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Visibilidad</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: true, label: "Público", desc: "Cualquiera puede encontrarlo y unirse", Icon: Globe },
                { value: false, label: "Privado", desc: "Solo por link o código QR", Icon: Lock },
              ].map(({ value, label, desc, Icon }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setIsPublic(value)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all",
                    isPublic === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Icon className="h-4 w-4" /> {label}
                  </span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isPending || !name.trim() || !competitionId}
        className="w-full h-12 rounded-xl text-base font-bold"
      >
        {isPending ? "Creando..." : "Crear prono"}
      </Button>
    </form>
  )
}
