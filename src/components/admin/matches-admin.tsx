"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { reportMatchResult } from "@/app/actions/matches"
import { toast } from "sonner"
import type { Match } from "@/types"

const PHASE_LABELS: Record<string, string> = {
  groups: "Fase de grupos",
  round_of_32: "Ronda de 32",
  round_of_16: "Octavos de final",
  quarterfinals: "Cuartos de final",
  semifinals: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
}
const PHASE_ORDER = ["groups", "round_of_32", "round_of_16", "quarterfinals", "semifinals", "third_place", "final"]

interface Props {
  matches: Match[]
}

function MatchRow({ match }: { match: Match }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? "")
  const [away, setAway] = useState(match.away_score?.toString() ?? "")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (home === "" || away === "") return
    startTransition(async () => {
      const res = await reportMatchResult({
        matchId: match.id,
        homeScore: parseInt(home),
        awayScore: parseInt(away),
      })
      if (res.error) toast.error(res.error)
      else toast.success(`Resultado guardado: ${match.home_team} ${home}-${away} ${match.away_team}`)
    })
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{match.home_team} vs {match.away_team}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(match.match_date).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {match.group_name && ` · ${match.group_name}`}
        </p>
      </div>

      {match.status === "finished" ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-black text-sm px-3">
            {match.home_score} - {match.away_score}
          </Badge>
          <Badge variant="secondary" className="text-xs">Finalizado</Badge>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number" min={0} max={20} value={home}
            onChange={e => setHome(e.target.value)}
            className="w-12 h-8 text-center p-0 text-sm font-bold"
            placeholder="0"
          />
          <span className="text-muted-foreground font-bold">-</span>
          <Input
            type="number" min={0} max={20} value={away}
            onChange={e => setAway(e.target.value)}
            className="w-12 h-8 text-center p-0 text-sm font-bold"
            placeholder="0"
          />
          <Button
            size="sm" onClick={handleSubmit}
            disabled={isPending || home === "" || away === ""}
            className="h-8 px-3 text-xs font-bold rounded-full"
          >
            {isPending ? "..." : "Guardar"}
          </Button>
        </div>
      )}
    </div>
  )
}

export function MatchesAdmin({ matches }: Props) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "finished">("upcoming")

  const filtered = matches.filter(m =>
    filter === "all" ? true : m.status === filter
  )

  const byPhase = PHASE_ORDER.reduce((acc, phase) => {
    const phaseMatches = filtered.filter(m => m.phase === phase)
    if (phaseMatches.length) acc[phase] = phaseMatches
    return acc
  }, {} as Record<string, Match[]>)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["upcoming", "finished", "all"] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="rounded-full text-xs"
          >
            {f === "upcoming" ? "Próximos" : f === "finished" ? "Finalizados" : "Todos"}
          </Button>
        ))}
      </div>

      {Object.entries(byPhase).map(([phase, phaseMatches]) => (
        <div key={phase}>
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-2">
            {PHASE_LABELS[phase]}
          </h3>
          <Card>
            <CardContent className="pt-2 pb-2">
              {phaseMatches.map(m => <MatchRow key={m.id} match={m} />)}
            </CardContent>
          </Card>
        </div>
      ))}

      {!Object.keys(byPhase).length && (
        <p className="text-center text-muted-foreground py-10">No hay partidos en esta categoría.</p>
      )}
    </div>
  )
}
