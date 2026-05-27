import type { Match, Prediction } from "@/types"

// For group-stage matches, derives the matchday (1, 2, 3…) within each group
// by clustering matches that are ≤48h apart into the same round.
export function computeMatchdays(matches: Match[]): Map<string, number> {
  const result = new Map<string, number>()
  const byGroup = new Map<string, Match[]>()

  for (const m of matches) {
    if (m.phase !== "groups") continue
    const g = m.group_name ?? "__"
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(m)
  }

  for (const gMatches of byGroup.values()) {
    const sorted = [...gMatches].sort(
      (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    )
    let fecha = 1
    let prevTime: number | null = null
    for (const m of sorted) {
      const t = new Date(m.match_date).getTime()
      if (prevTime !== null && t - prevTime > 48 * 3600 * 1000) fecha++
      result.set(m.id, fecha)
      prevTime = t
    }
  }

  return result
}

export interface MatchFilters {
  fecha: number | null
  group: string | null
  status: "upcoming" | "finished" | null
  unpredicted: boolean
}

export const EMPTY_FILTERS: MatchFilters = {
  fecha: null, group: null, status: null, unpredicted: false,
}

export function isFiltersEmpty(f: MatchFilters) {
  return f.fecha === null && f.group === null && f.status === null && !f.unpredicted
}

export function applyFilters(
  matches: Match[],
  filters: MatchFilters,
  matchdays: Map<string, number>,
  predictedIds: Set<string>,
): Match[] {
  return matches.filter(m => {
    if (filters.status && m.status !== filters.status) return false
    if (filters.unpredicted && predictedIds.has(m.id)) return false
    if (filters.fecha !== null) {
      if (m.phase !== "groups") return false
      if (matchdays.get(m.id) !== filters.fecha) return false
    }
    if (filters.group !== null) {
      if (m.phase !== "groups" || m.group_name !== filters.group) return false
    }
    return true
  })
}

export function getAvailableFechas(matches: Match[], matchdays: Map<string, number>): number[] {
  const set = new Set<number>()
  for (const m of matches) {
    const d = matchdays.get(m.id)
    if (d !== undefined) set.add(d)
  }
  return [...set].sort((a, b) => a - b)
}

export function getAvailableGroups(matches: Match[]): string[] {
  const set = new Set<string>()
  for (const m of matches) {
    if (m.phase === "groups" && m.group_name) set.add(m.group_name)
  }
  return [...set].sort()
}
