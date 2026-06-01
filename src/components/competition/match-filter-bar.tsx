"use client"

import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import type { MatchFilters } from "@/lib/match-utils"
import { EMPTY_FILTERS, isFiltersEmpty } from "@/lib/match-utils"

interface Props {
  filters: MatchFilters
  onChange: (f: MatchFilters) => void
  availableFechas: number[]
  availableGroups: string[]
  showUnpredicted: boolean
  showUpcoming?: boolean
}

function Pill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

export function MatchFilterBar({ filters, onChange, availableFechas, availableGroups, showUnpredicted, showUpcoming = true }: Props) {
  const set = (patch: Partial<MatchFilters>) => onChange({ ...filters, ...patch })
  const hasFilters = !isFiltersEmpty(filters)

  const showFechas = availableFechas.length > 1
  const showGroups = availableGroups.length > 1

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {showUnpredicted && (
        <Pill active={filters.unpredicted} onClick={() => set({ unpredicted: !filters.unpredicted })}>
          Sin pronosticar
        </Pill>
      )}

      {showFechas && availableFechas.map(f => (
        <Pill key={f} active={filters.fecha === f} onClick={() => set({ fecha: filters.fecha === f ? null : f })}>
          Fecha {f}
        </Pill>
      ))}

      {showGroups && (
        <select
          value={filters.group ?? ""}
          onChange={e => set({ group: e.target.value || null })}
          className={cn(
            "shrink-0 px-2 py-1 rounded-full text-xs font-semibold border transition-colors bg-background cursor-pointer",
            filters.group
              ? "border-primary text-primary bg-primary/5"
              : "border-border text-muted-foreground hover:border-primary/40"
          )}
        >
          <option value="">Todos los grupos</option>
          {availableGroups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      )}

      {showUpcoming && (
        <Pill active={filters.status === "upcoming"} onClick={() => set({ status: filters.status === "upcoming" ? null : "upcoming" })}>
          Próximos
        </Pill>
      )}
      <Pill active={filters.status === "finished"} onClick={() => set({ status: filters.status === "finished" ? null : "finished" })}>
        Finalizados
      </Pill>

      {hasFilters && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
        >
          <X className="h-3 w-3" /> Limpiar
        </button>
      )}
    </div>
  )
}
