"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { MatchCard } from "./match-card"
import { MatchListRow } from "./match-list-row"
import { MatchFilterBar } from "./match-filter-bar"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  computeMatchdays, applyFilters, getAvailableFechas, getAvailableGroups,
  EMPTY_FILTERS, type MatchFilters,
} from "@/lib/match-utils"
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
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_FILTERS)

  const matchdays = useMemo(() => computeMatchdays(matches), [matches])
  const predictedIds = useMemo(() => new Set(predMap.keys()), [predMap])
  const availableFechas = useMemo(() => getAvailableFechas(matches, matchdays), [matches, matchdays])
  const availableGroups = useMemo(() => getAvailableGroups(matches), [matches])

  const filtered = useMemo(
    () => applyFilters(matches, filters, matchdays, predictedIds),
    [matches, filters, matchdays, predictedIds]
  )

  const byPhase = useMemo(() => filtered.reduce((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {} as Record<string, Match[]>), [filtered])

  // Within groups, sub-group by fecha (only when no fecha filter active)
  const groupsByFecha = useMemo(() => {
    if (!byPhase.groups) return new Map<number, Match[]>()
    const map = new Map<number, Match[]>()
    for (const m of byPhase.groups) {
      const f = matchdays.get(m.id) ?? 0
      if (!map.has(f)) map.set(f, [])
      map.get(f)!.push(m)
    }
    return map
  }, [byPhase.groups, matchdays])

  function renderGrid(ms: Match[]) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ms.map(m => (
          <MatchCard key={m.id} match={m} prediction={predMap.get(m.id) ?? null} userId={userId} />
        ))}
      </div>
    )
  }

  function renderList(ms: Match[]) {
    return (
      <div className="flex flex-col gap-2">
        {ms.map(m => (
          <MatchListRow key={m.id} match={m} prediction={predMap.get(m.id) ?? null} userId={userId} />
        ))}
      </div>
    )
  }

  const hasResults = PHASE_ORDER.some(p => byPhase[p]?.length)

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <MatchFilterBar
            filters={filters}
            onChange={setFilters}
            availableFechas={availableFechas}
            availableGroups={availableGroups}
            showUnpredicted={!!userId}
          />
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
          <button
            onClick={() => setView("grid")}
            className={cn("p-2 transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("p-2 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Matches */}
      {PHASE_ORDER.filter(p => {
        if (!byPhase[p]?.length) return false
        // Non-group phases only appear once at least one match has started/finished
        if (p !== "groups" && byPhase[p].every(m => m.status === "upcoming")) return false
        return true
      }).map(phase => (
        <div key={phase} className="space-y-4">
          {/* Groups phase: sub-group by fecha */}
          {phase === "groups" ? (
            filters.fecha !== null ? (
              // Fecha filter active: flat list, no sub-header
              view === "grid" ? renderGrid(byPhase.groups) : renderList(byPhase.groups)
            ) : (
              // No fecha filter: show fecha sub-sections
              [...groupsByFecha.entries()].sort(([a], [b]) => a - b).map(([fecha, ms]) => (
                <div key={fecha}>
                  <h3 className="font-bold text-lg mb-3">
                    <Badge variant="outline" className="text-primary border-primary/30">
                      Fecha {fecha}
                    </Badge>
                  </h3>
                  {view === "grid" ? renderGrid(ms) : renderList(ms)}
                </div>
              ))
            )
          ) : (
            // Knockout phases
            <div>
              <h3 className="font-bold text-lg mb-3">
                <Badge variant="outline" className="text-primary border-primary/30">
                  {PHASE_LABELS[phase]}
                </Badge>
              </h3>
              {view === "grid" ? renderGrid(byPhase[phase]) : renderList(byPhase[phase])}
            </div>
          )}
        </div>
      ))}

      {!hasResults && (
        <p className="text-center text-muted-foreground py-10">
          {matches.length ? "No hay partidos con esos filtros." : "Los partidos se cargarán próximamente."}
        </p>
      )}
    </div>
  )
}
