"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { MatchCard } from "./match-card"
import { MatchListRow } from "./match-list-row"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Match, Prediction } from "@/types"

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
  predMap: Map<string, Prediction>
  userId: string | null
}

export function MatchesView({ matches, predMap, userId }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid")

  const byPhase = matches.reduce((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {} as Record<string, Match[]>)

  return (
    <div className="space-y-8">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "p-2 transition-colors",
              view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "p-2 transition-colors",
              view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {PHASE_ORDER.filter(p => byPhase[p]?.length).map(phase => (
        <div key={phase}>
          <h3 className="font-bold text-lg mb-4">
            <Badge variant="outline" className="text-primary border-primary/30">{PHASE_LABELS[phase]}</Badge>
          </h3>
          {view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byPhase[phase].map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predMap.get(match.id) ?? null}
                  userId={userId}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {byPhase[phase].map(match => (
                <MatchListRow
                  key={match.id}
                  match={match}
                  prediction={predMap.get(match.id) ?? null}
                  userId={userId}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {!matches.length && (
        <p className="text-center text-muted-foreground py-10">Los partidos se cargarán próximamente.</p>
      )}
    </div>
  )
}
