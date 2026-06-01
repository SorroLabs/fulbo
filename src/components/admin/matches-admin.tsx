"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Bug, Trash2 } from "lucide-react"
import { reportMatchResult, revertMatchResult } from "@/app/actions/matches"
import { syncMatches, testApiFootball } from "@/app/actions/sync"
import { getTeamFlag } from "@/lib/team-flags"
import { toast } from "sonner"
import type { Match, Competition } from "@/types"

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

function MatchRow({
  match,
  onSaved,
  onReverted,
}: {
  match: Match
  onSaved: (matchId: string, home: number, away: number) => void
  onReverted: (matchId: string) => void
}) {
  const [home, setHome] = useState(match.home_score?.toString() ?? "")
  const [away, setAway] = useState(match.away_score?.toString() ?? "")
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isReverting, startReverting] = useTransition()

  const handleSubmit = () => {
    if (home === "" || away === "") return
    startTransition(async () => {
      const res = await reportMatchResult({
        matchId: match.id,
        homeScore: parseInt(home),
        awayScore: parseInt(away),
      })
      if (res.error) toast.error(res.error)
      else {
        toast.success(`${match.home_team} ${home}-${away} ${match.away_team}`)
        onSaved(match.id, parseInt(home), parseInt(away))
        setEditing(false)
      }
    })
  }

  const handleRevert = () => {
    startReverting(async () => {
      const res = await revertMatchResult({ matchId: match.id })
      if (res.error) toast.error(res.error)
      else {
        toast.success("Resultado revertido — partido vuelve a Próximo")
        onReverted(match.id)
        setHome("")
        setAway("")
        setEditing(false)
      }
    })
  }

  const handleCancel = () => {
    setHome(match.home_score?.toString() ?? "")
    setAway(match.away_score?.toString() ?? "")
    setEditing(false)
  }

  const showInputs = match.status !== "finished" || editing

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {getTeamFlag(match.home_team) && <img src={getTeamFlag(match.home_team)!} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
          <span className="text-sm font-semibold">{match.home_team}</span>
          <span className="text-muted-foreground text-xs">vs</span>
          {getTeamFlag(match.away_team) && <img src={getTeamFlag(match.away_team)!} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
          <span className="text-sm font-semibold">{match.away_team}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(match.match_date).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {match.group_name && match.group_name !== "TEST" && ` · ${match.group_name}`}
          {match.group_name === "TEST" && <span className="text-yellow-500 font-bold"> · TEST</span>}
        </p>
      </div>

      {showInputs ? (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <input type="number" min={0} max={20} value={home}
            onChange={e => setHome(e.target.value)}
            placeholder="0"
            className="w-12 h-8 text-sm font-bold rounded-lg border border-input bg-transparent outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            style={{ textAlign: "center", padding: 0 }} />
          <span className="text-muted-foreground font-bold">-</span>
          <input type="number" min={0} max={20} value={away}
            onChange={e => setAway(e.target.value)}
            placeholder="0"
            className="w-12 h-8 text-sm font-bold rounded-lg border border-input bg-transparent outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            style={{ textAlign: "center", padding: 0 }} />
          <Button size="sm" onClick={handleSubmit}
            disabled={isPending || home === "" || away === ""}
            className="h-8 px-3 text-xs font-bold rounded-full">
            {isPending ? "..." : "Guardar"}
          </Button>
          {editing && (
            <>
              <Button size="sm" variant="ghost" onClick={handleCancel}
                disabled={isPending || isReverting}
                className="h-8 px-2 text-xs rounded-full text-muted-foreground">
                Cancelar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRevert}
                disabled={isPending || isReverting}
                className="h-8 px-2 text-xs rounded-full text-destructive hover:bg-destructive/10 gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                {isReverting ? "..." : "Borrar"}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-black text-sm px-3">
            {match.home_score} - {match.away_score}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}
            className="h-7 px-2 text-xs rounded-full text-muted-foreground hover:text-foreground">
            Editar
          </Button>
        </div>
      )}
    </div>
  )
}

interface Props {
  competitions: Competition[]
  allMatches: Match[]
  defaultCompetitionId?: string
}

export function MatchesAdmin({ competitions, allMatches, defaultCompetitionId }: Props) {
  const [matches, setMatches] = useState(allMatches)
  const [selectedId, setSelectedId] = useState(defaultCompetitionId ?? competitions[0]?.id ?? "")
  const [filter, setFilter] = useState<"upcoming" | "finished" | "all">("upcoming")
  const [isSyncing, startSyncing] = useTransition()
  const [isTesting, startTesting] = useTransition()

  const competition = competitions.find(c => c.id === selectedId)

  function handleMatchSaved(matchId: string, home: number, away: number) {
    setMatches(prev => prev.map(m => m.id === matchId
      ? { ...m, status: "finished" as const, home_score: home, away_score: away }
      : m))
  }

  function handleMatchReverted(matchId: string) {
    setMatches(prev => prev.map(m => m.id === matchId
      ? { ...m, status: "upcoming" as const, home_score: null, away_score: null }
      : m))
  }

  const matchesForComp = matches.filter(m => m.competition_id === selectedId)
  const filtered = matchesForComp.filter(m =>
    filter === "all" ? true : m.status === filter
  )
  const byPhase = PHASE_ORDER.reduce((acc, phase) => {
    const ms = filtered.filter(m => m.phase === phase)
    if (ms.length) acc[phase] = ms
    return acc
  }, {} as Record<string, Match[]>)

  const upcomingCount = matchesForComp.filter(m => m.status === "upcoming").length
  const finishedCount = matchesForComp.filter(m => m.status === "finished").length

  function handleSync() {
    startSyncing(async () => {
      const res = await syncMatches(selectedId)
      if ("error" in res) toast.error(res.error)
      else toast.success(`Sincronizados: ${res.synced} partidos`, { duration: 5000 })
    })
  }

  function handleTest() {
    if (!competition?.api_league_id) {
      toast.error("Esta competición no tiene league ID configurado")
      return
    }
    startTesting(async () => {
      const res = await testApiFootball(competition.api_league_id!, parseInt(competition.season))
      toast.info(JSON.stringify(res), { duration: 15000 })
    })
  }

  if (!competitions.length) {
    return <p className="text-center text-muted-foreground py-10">No hay competiciones creadas.</p>
  }

  return (
    <div className="space-y-6">
      {/* Stats + sync row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-1">
          <span><span className="font-bold text-foreground">{matchesForComp.length}</span> totales</span>
          <span>·</span>
          <span><span className="font-bold text-amber-500">{upcomingCount}</span> próximos</span>
          <span>·</span>
          <span><span className="font-bold text-emerald-500">{finishedCount}</span> finalizados</span>
        </div>
        {competition?.api_league_id && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSync} disabled={isSyncing}
              className="rounded-full gap-2 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sync API"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleTest} disabled={isTesting}
              className="rounded-full text-xs px-2" title="Test API Football">
              <Bug className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(["upcoming", "finished", "all"] as const).map(f => (
          <Button key={f} size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="rounded-full text-xs">
            {f === "upcoming" ? "Próximos" : f === "finished" ? "Finalizados" : "Todos"}
          </Button>
        ))}
      </div>

      {/* Match list */}
      {Object.entries(byPhase).map(([phase, phaseMatches]) => (
        <div key={phase}>
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-2">
            {PHASE_LABELS[phase] ?? phase}
          </h3>
          <Card>
            <CardContent className="pt-2 pb-2">
              {phaseMatches.map(m => (
                <MatchRow
                  key={m.id}
                  match={m}
                  onSaved={handleMatchSaved}
                  onReverted={handleMatchReverted}
                />
              ))}
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
