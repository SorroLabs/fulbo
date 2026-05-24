"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Target, Star, Lock, ChevronDown, Search } from "lucide-react"
import { saveSpecialPrediction } from "@/app/actions/predictions"
import { getTeamFlag } from "@/lib/team-flags"
import { toast } from "sonner"
import { SPECIAL_PREDICTION_POINTS } from "@/types"
import { cn } from "@/lib/utils"

interface Props {
  competitionId: string
  competitionStatus: string
  userId: string | null
  existing: any[]
  teams: string[]
}

const SPECIALS = [
  { type: "champion" as const, label: "Campeón del torneo", icon: Trophy, pts: SPECIAL_PREDICTION_POINTS.champion, isTeam: true },
  { type: "top_scorer" as const, label: "Goleador del torneo", icon: Target, pts: SPECIAL_PREDICTION_POINTS.top_scorer, isTeam: false, placeholder: "Ej: Kylian Mbappé" },
  { type: "surprise_team" as const, label: "Sorpresa del torneo", icon: Star, pts: SPECIAL_PREDICTION_POINTS.surprise_team, isTeam: true },
]

function TeamFlag({ name }: { name: string }) {
  const src = getTeamFlag(name)
  if (!src) return <div className="w-6 h-4 rounded-sm bg-muted shrink-0" />
  return <img src={src} alt={name} className="w-6 h-4 object-cover rounded-sm shrink-0" />
}

function TeamCombobox({ teams, value, onChange, disabled }: {
  teams: string[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = query
    ? teams.filter(t => t.toLowerCase().includes(query.toLowerCase()))
    : teams

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full h-10 px-3 rounded-xl border border-input bg-background text-sm flex items-center gap-2 transition-colors",
          "hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed",
          open && "border-ring ring-2 ring-ring/50"
        )}
      >
        {value ? (
          <>
            <TeamFlag name={value} />
            <span className="flex-1 text-left truncate">{value}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">Elegí un equipo...</span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar equipo..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              filtered.map(team => (
                <button
                  key={team}
                  type="button"
                  onClick={() => { onChange(team); setOpen(false); setQuery("") }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                    team === value && "bg-primary/10 text-primary font-semibold"
                  )}
                >
                  <TeamFlag name={team} />
                  {team}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function SpecialPredictionsForm({ competitionId, competitionStatus, userId, existing, teams }: Props) {
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
      {SPECIALS.map(({ type, label, icon: Icon, pts, isTeam, placeholder }) => {
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
                  <div className="flex items-center gap-2">
                    {isTeam && <TeamFlag name={saved.value} />}
                    <span className="font-semibold">{saved.value}</span>
                  </div>
                  <span className={`font-black text-lg ${saved.points_earned > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    +{saved.points_earned} pts
                  </span>
                </div>
              ) : (
                <div className="flex gap-3">
                  {isTeam ? (
                    <TeamCombobox
                      teams={teams}
                      value={values[type]}
                      onChange={v => setValues(prev => ({ ...prev, [type]: v }))}
                      disabled={isLocked}
                    />
                  ) : (
                    <input
                      value={values[type]}
                      onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                      placeholder={placeholder}
                      disabled={isLocked}
                      className="flex-1 h-10 px-3 rounded-xl border border-input bg-transparent text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  )}
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
