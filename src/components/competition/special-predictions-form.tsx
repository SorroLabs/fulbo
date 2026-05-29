"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
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
  { type: "golden_ball" as const, label: "Balón de Oro (mejor jugador)", icon: Star, pts: SPECIAL_PREDICTION_POINTS.golden_ball, isTeam: false, placeholder: "Ej: Lionel Messi" },
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
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      const dropdown = document.getElementById("team-combobox-portal")
      if (dropdown?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    if (open) {
      setRect(triggerRef.current?.getBoundingClientRect() ?? null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = query
    ? teams.filter(t => t.toLowerCase().includes(query.toLowerCase()))
    : teams

  const dropdown = open && rect ? createPortal(
    <div
      id="team-combobox-portal"
      style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
      className="rounded-xl border border-border bg-background shadow-lg overflow-hidden"
    >
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
    </div>,
    document.body
  ) : null

  return (
    <div className="relative flex-1">
      <button
        ref={triggerRef}
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
      {dropdown}
    </div>
  )
}

export function SpecialPredictionsForm({ competitionId, competitionStatus, userId, existing, teams }: Props) {
  const existingMap = new Map(existing.map(e => [e.type, e]))
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(SPECIALS.map(s => [s.type, existingMap.get(s.type)?.value ?? ""]))
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const isLocked = competitionStatus !== "upcoming" || !userId

  function handleSave(type: string, value: string) {
    if (!userId || !value.trim()) return
    setSaving(s => ({ ...s, [type]: true }))
    startTransition(async () => {
      const res = await saveSpecialPrediction({ userId, competitionId, type: type as any, value: value.trim() })
      if (res.error) toast.error(res.error)
      else toast.success("Guardado")
      setSaving(s => ({ ...s, [type]: false }))
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
                <div className="space-y-2">
                  {isTeam ? (
                    <TeamCombobox
                      teams={teams}
                      value={values[type]}
                      onChange={v => { setValues(prev => ({ ...prev, [type]: v })); handleSave(type, v) }}
                      disabled={isLocked}
                    />
                  ) : (
                    <input
                      value={values[type]}
                      onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                      onBlur={e => handleSave(type, e.target.value)}
                      placeholder={placeholder}
                      disabled={isLocked}
                      className="w-full h-10 px-3 rounded-xl border border-input bg-transparent text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  )}
                  {values[type] && (
                    <p className="text-xs text-right text-muted-foreground">
                      {saving[type] ? "Guardando..." : "✓ Guardado"}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
