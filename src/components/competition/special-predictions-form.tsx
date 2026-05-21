"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Trophy, Target, Star, Lock } from "lucide-react"
import { saveSpecialPrediction } from "@/app/actions/predictions"
import { toast } from "sonner"
import { SPECIAL_PREDICTION_POINTS } from "@/types"

interface Props {
  competitionId: string
  competitionStatus: string
  userId: string | null
  existing: any[]
}

const SPECIALS = [
  { type: "champion" as const, label: "Campeón del torneo", icon: Trophy, pts: SPECIAL_PREDICTION_POINTS.champion, placeholder: "Ej: Argentina" },
  { type: "top_scorer" as const, label: "Goleador del torneo", icon: Target, pts: SPECIAL_PREDICTION_POINTS.top_scorer, placeholder: "Ej: Kylian Mbappé" },
  { type: "surprise_team" as const, label: "Sorpresa del torneo", icon: Star, pts: SPECIAL_PREDICTION_POINTS.surprise_team, placeholder: "Ej: Marruecos" },
]

export function SpecialPredictionsForm({ competitionId, competitionStatus, userId, existing }: Props) {
  const existingMap = new Map(existing.map(e => [e.type, e]))
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(SPECIALS.map(s => [s.type, existingMap.get(s.type)?.value ?? ""]))
  )
  const [isPending, startTransition] = useTransition()

  const isLocked = competitionStatus !== "upcoming" || !userId

  function handleSave(type: string) {
    if (!userId || !values[type]) return
    startTransition(async () => {
      const res = await saveSpecialPrediction({ userId, competitionId, type: type as any, value: values[type] })
      if (res.error) toast.error(res.error)
      else toast.success("Predicción especial guardada")
    })
  }

  if (!userId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Iniciá sesión para cargar tus predicciones especiales</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Las predicciones especiales se cargan antes de que empiece el torneo y valen puntos extra.
        {isLocked && competitionStatus !== "upcoming" && " Ya no se pueden modificar."}
      </p>
      {SPECIALS.map(({ type, label, icon: Icon, pts, placeholder }) => {
        const saved = existingMap.get(type)
        return (
          <Card key={type} className={saved ? "border-primary/30" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </span>
                <span className="text-primary font-black">{pts} pts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {saved?.points_earned !== null && saved?.points_earned !== undefined ? (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                  <span className="font-semibold">{saved.value}</span>
                  <span className={`font-black text-lg ${saved.points_earned > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    +{saved.points_earned} pts
                  </span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Input
                    value={values[type]}
                    onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                    placeholder={placeholder}
                    disabled={isLocked}
                    className="rounded-xl"
                  />
                  <Button
                    onClick={() => handleSave(type)}
                    disabled={isPending || isLocked || !values[type]}
                    className="rounded-xl shrink-0"
                  >
                    {saved ? "Actualizar" : "Guardar"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
