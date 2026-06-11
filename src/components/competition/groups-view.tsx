"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp } from "lucide-react"
import { getTeamFlag } from "@/lib/team-flags"
import { cn } from "@/lib/utils"
import type { Match } from "@/types"

interface TeamStats {
  name: string
  logo: string | null
  pj: number
  g: number
  e: number
  p: number
  gf: number
  gc: number
  pts: number
}

function calcGroupStandings(matches: Match[]): TeamStats[] {
  const stats = new Map<string, TeamStats>()

  const ensure = (name: string, logo: string | null) => {
    if (!stats.has(name)) stats.set(name, { name, logo, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 })
  }

  for (const m of matches) {
    ensure(m.home_team, m.home_team_logo)
    ensure(m.away_team, m.away_team_logo)

    if (m.status !== "finished" || m.home_score == null || m.away_score == null) continue

    const home = stats.get(m.home_team)!
    const away = stats.get(m.away_team)!

    home.pj++; away.pj++
    home.gf += m.home_score; home.gc += m.away_score
    away.gf += m.away_score; away.gc += m.home_score

    if (m.home_score > m.away_score) {
      home.g++; home.pts += 3; away.p++
    } else if (m.home_score < m.away_score) {
      away.g++; away.pts += 3; home.p++
    } else {
      home.e++; away.e++; home.pts++; away.pts++
    }
  }

  return [...stats.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const diffB = b.gf - b.gc, diffA = a.gf - a.gc
    if (diffB !== diffA) return diffB - diffA
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.name.localeCompare(b.name)
  })
}

function Flag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo ?? getTeamFlag(name)
  if (!src) return <div className="w-5 h-3.5 rounded-sm bg-muted shrink-0" />
  return <img src={src} alt={name} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
}

function GroupCard({ groupName, matches }: { groupName: string; matches: Match[] }) {
  const [open, setOpen] = useState(false)
  const standings = useMemo(() => calcGroupStandings(matches), [matches])
  const playedMatches = matches.filter(m => m.status === "finished" || m.status === "live")
  const upcoming = matches.filter(m => m.status === "upcoming")

  return (
    <Card>
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Group header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-primary border-primary/30 font-bold">
            {groupName}
          </Badge>
          <span className="text-xs text-muted-foreground">{playedMatches.length}/{matches.length} jugados</span>
        </div>

        {/* Standings table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left pb-1.5 font-medium w-6">#</th>
                <th className="text-left pb-1.5 font-medium">Equipo</th>
                <th className="text-center pb-1.5 font-medium w-7">PJ</th>
                <th className="text-center pb-1.5 font-medium w-7">G</th>
                <th className="text-center pb-1.5 font-medium w-7">E</th>
                <th className="text-center pb-1.5 font-medium w-7">P</th>
                <th className="text-center pb-1.5 font-medium w-8">Dif</th>
                <th className="text-center pb-1.5 font-bold text-primary w-8">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((t, i) => (
                <tr
                  key={t.name}
                  className={cn(
                    "border-b border-border/30 last:border-0",
                    i < 2 && "bg-primary/5"
                  )}
                >
                  <td className="py-2 pr-1">
                    <span className={cn("font-bold", i < 2 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Flag name={t.name} logo={t.logo} />
                      <span className={cn("font-medium truncate max-w-[100px]", i < 2 && "font-semibold")}>{t.name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center text-muted-foreground">{t.pj}</td>
                  <td className="py-2 text-center text-muted-foreground">{t.g}</td>
                  <td className="py-2 text-center text-muted-foreground">{t.e}</td>
                  <td className="py-2 text-center text-muted-foreground">{t.p}</td>
                  <td className="py-2 text-center text-muted-foreground">
                    {t.gf - t.gc > 0 ? `+${t.gf - t.gc}` : t.gf - t.gc}
                  </td>
                  <td className="py-2 text-center font-black text-primary">{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Collapsible matches */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors pt-1 border-t border-border/30"
        >
          <span>Ver partidos del grupo</span>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {open && (
          <div className="space-y-1.5 pt-1">
            {[...playedMatches, ...upcoming].map(m => {
              const dateStr = new Date(m.match_date).toLocaleString("es", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })
              return (
                <div key={m.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                    <span className="truncate font-medium">{m.home_team}</span>
                    <Flag name={m.home_team} logo={m.home_team_logo} />
                  </div>
                  <div className="shrink-0 text-center w-16">
                    {m.status === "finished" ? (
                      <span className="font-black">{m.home_score} - {m.away_score}</span>
                    ) : m.status === "live" ? (
                      <span className="font-black text-green-500">EN VIVO</span>
                    ) : (
                      <span className="text-muted-foreground">{dateStr}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Flag name={m.away_team} logo={m.away_team_logo} />
                    <span className="truncate font-medium">{m.away_team}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function GroupsView({ matches }: { matches: Match[] }) {
  const groupMatches = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of matches) {
      if (m.phase !== "groups" || !m.group_name) continue
      if (!map.has(m.group_name)) map.set(m.group_name, [])
      map.get(m.group_name)!.push(m)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [matches])

  // Best 8 third-place teams (3rd from each of the 12 groups)
  const bestThirds = useMemo(() => {
    return groupMatches
      .map(([groupName, ms]) => {
        const standings = calcGroupStandings(ms)
        const third = standings[2]
        return third ? { ...third, groupName } : null
      })
      .filter((t): t is TeamStats & { groupName: string } => t !== null)
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts
        const diffB = b.gf - b.gc, diffA = a.gf - a.gc
        if (diffB !== diffA) return diffB - diffA
        if (b.gf !== a.gf) return b.gf - a.gf
        return a.name.localeCompare(b.name)
      })
  }, [groupMatches])

  if (groupMatches.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Los grupos se mostrarán cuando comiencen los partidos.</p>
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupMatches.map(([name, ms]) => (
          <GroupCard key={name} groupName={name} matches={ms} />
        ))}
      </div>

      {/* Best 8 thirds */}
      {bestThirds.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-primary border-primary/30 font-bold">
                Mejores terceros
              </Badge>
              <span className="text-xs text-muted-foreground">Top 8 clasifican a Ronda de 32</span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left pb-1.5 font-medium w-6">#</th>
                    <th className="text-left pb-1.5 font-medium">Equipo</th>
                    <th className="text-center pb-1.5 font-medium w-12">Grupo</th>
                    <th className="text-center pb-1.5 font-medium w-7">PJ</th>
                    <th className="text-center pb-1.5 font-medium w-7">G</th>
                    <th className="text-center pb-1.5 font-medium w-7">E</th>
                    <th className="text-center pb-1.5 font-medium w-7">P</th>
                    <th className="text-center pb-1.5 font-medium w-8">Dif</th>
                    <th className="text-center pb-1.5 font-bold text-primary w-8">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {bestThirds.map((t, i) => (
                    <tr
                      key={t.name}
                      className={cn(
                        "border-b border-border/30 last:border-0",
                        i < 8 && "bg-primary/5"
                      )}
                    >
                      <td className="py-2 pr-1">
                        <span className={cn("font-bold", i < 8 ? "text-primary" : "text-muted-foreground")}>{i + 1}</span>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Flag name={t.name} logo={t.logo} />
                          <span className={cn("font-medium truncate max-w-[100px]", i < 8 && "font-semibold")}>{t.name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-center text-muted-foreground">{t.groupName.replace("Grupo ", "")}</td>
                      <td className="py-2 text-center text-muted-foreground">{t.pj}</td>
                      <td className="py-2 text-center text-muted-foreground">{t.g}</td>
                      <td className="py-2 text-center text-muted-foreground">{t.e}</td>
                      <td className="py-2 text-center text-muted-foreground">{t.p}</td>
                      <td className="py-2 text-center text-muted-foreground">
                        {t.gf - t.gc > 0 ? `+${t.gf - t.gc}` : t.gf - t.gc}
                      </td>
                      <td className="py-2 text-center font-black text-primary">{t.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
