"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, Star, CheckCircle } from "lucide-react"
import { scoreSpecialPredictions } from "@/app/actions/matches"
import { toast } from "sonner"
import type { Competition } from "@/types"

const SPECIALS = [
  { type: "champion" as const, label: "Campeón del torneo", icon: Trophy, note: "Se auto-scorea al cargar el resultado de la final. Podés corregirlo acá si hubo penales." },
  { type: "top_scorer" as const, label: "Goleador del torneo", icon: Target, note: "Ingresá el nombre exacto del goleador oficial." },
  { type: "golden_ball" as const, label: "Balón de Oro (mejor jugador)", icon: Star, note: "Ingresá el nombre exacto del ganador del Balón de Oro." },
]

interface Props {
  competitions: Competition[]
  specialPredictionCounts: Record<string, Record<string, number>>
  defaultCompetitionId?: string
}

function SpecialRow({ type, label, icon: Icon, note, competitionId, currentAnswer }: {
  type: "champion" | "top_scorer" | "golden_ball"
  label: string
  icon: typeof Trophy
  note: string
  competitionId: string
  currentAnswer?: string
}) {
  const [value, setValue] = useState(currentAnswer ?? "")
  const [isPending, startTransition] = useTransition()

  function handleScore() {
    if (!value.trim()) return
    startTransition(async () => {
      const res = await scoreSpecialPredictions({ competitionId, type, correctValue: value.trim() })
      if (res.error) toast.error(res.error)
      else toast.success(`Predicciones de "${label}" scoradas`)
    })
  }

  return (
    <div className="flex flex-col gap-2 py-4 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-sm">{label}</span>
        {currentAnswer && (
          <Badge variant="outline" className="text-primary border-primary/30 text-xs gap-1">
            <CheckCircle className="h-3 w-3" /> {currentAnswer}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{note}</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={type === "champion" ? "Ej: Argentina" : "Ej: Kylian Mbappé"}
          className="flex-1 h-9 px-3 rounded-lg border border-input bg-transparent text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button
          size="sm"
          onClick={handleScore}
          disabled={isPending || !value.trim()}
          className="rounded-full h-9 px-4 text-xs font-bold"
        >
          {isPending ? "Scoreando..." : "Scorear"}
        </Button>
      </div>
    </div>
  )
}

export function SpecialPredictionsAdmin({ competitions, specialPredictionCounts, defaultCompetitionId }: Props) {
  const [selectedId, setSelectedId] = useState(defaultCompetitionId ?? competitions[0]?.id ?? "")
  const counts = specialPredictionCounts[selectedId] ?? {}

  if (!competitions.length) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {competitions.map(comp => (
          <button
            key={comp.id}
            onClick={() => setSelectedId(comp.id)}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
              comp.id === selectedId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {comp.name} · {comp.season}
          </button>
        ))}
      </div>

      <div className="text-sm text-muted-foreground">
        Total de predicciones especiales:{" "}
        <span className="font-bold text-foreground">
          {Object.values(counts).reduce((a, b) => a + b, 0)}
        </span>
        {Object.entries(counts).map(([type, count]) => (
          <span key={type} className="ml-3">
            {SPECIALS.find(s => s.type === type)?.label ?? type}: <span className="font-semibold">{count}</span>
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="pt-2 pb-2">
          {SPECIALS.map(s => (
            <SpecialRow
              key={s.type}
              {...s}
              competitionId={selectedId}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
