"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, FlaskConical, Trash2, RefreshCw, Bug } from "lucide-react"
import { reportMatchResult, revertMatchResult, createTestMatch, deleteTestMatches } from "@/app/actions/matches"
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

function MatchRow({ match }: { match: Match }) {
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
        <div className="flex items-center gap-2">
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
                className="h-8 px-2 text-xs rounded-full text-destructive hover:bg-destructive/10"
                title="Revertir a sin jugar">
                {isReverting ? "..." : "— x —"}
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
  const [selectedId, setSelectedId] = useState(defaultCompetitionId ?? competitions[0]?.id ?? "")
  const [filter, setFilter] = useState<"upcoming" | "finished" | "all">("upcoming")
  const [isCreating, startCreating] = useTransition()
  const [isDeleting, startDeleting] = useTransition()
  const [isSyncing, startSyncing] = useTransition()
  const [isTesting, startTesting] = useTransition()

  const competition = competitions.find(c => c.id === selectedId)

  const matchesForComp = allMatches.filter(m => m.competition_id === selectedId)
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

  function handleCreateTest(minutesFromNow: number) {
    startCreating(async () => {
      const res = await createTestMatch({ competitionId: selectedId, minutesFromNow })
      if (res.error) toast.error(res.error)
      else toast.success(`Partido de prueba en ${minutesFromNow} min creado`)
    })
  }

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

  function handleDeleteTests() {
    startDeleting(async () => {
      const res = await deleteTestMatches({ competitionId: selectedId })
      if (res.error) toast.error(res.error)
      else toast.success("Partidos de prueba eliminados")
    })
  }

  if (!competitions.length) {
    return <p className="text-center text-muted-foreground py-10">No hay competiciones creadas.</p>
  }

  return (
    <div className="space-y-6">
      {/* Competition selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Competición</p>
        <div className="flex flex-wrap gap-2">
          {competitions.map(comp => {
            const isActive = comp.id === selectedId
            return (
              <button
                key={comp.id}
                onClick={() => { setSelectedId(comp.id); setFilter("upcoming") }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {comp.logo_url
                  ? <img src={comp.logo_url} alt="" className="w-5 h-5 object-contain" />
                  : <Trophy className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                }
                <span>{comp.name}</span>
                <span className={`text-xs font-normal ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {comp.season}
                </span>
              </button>
            )
          })}
        </div>
      </div>

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
              {phaseMatches.map(m => <MatchRow key={m.id} match={m} />)}
            </CardContent>
          </Card>
        </div>
      ))}

      {!Object.keys(byPhase).length && (
        <p className="text-center text-muted-foreground py-10">No hay partidos en esta categoría.</p>
      )}

      {/* Test controls */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-xl border border-dashed border-border">
        <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground font-medium">
          Test en <span className="text-foreground font-semibold">{competition?.name}</span>:
        </span>
        {[25, 5, 1].map(min => (
          <Button key={min} size="sm" variant="outline" disabled={isCreating}
            onClick={() => handleCreateTest(min)}
            className="rounded-full text-xs h-7 px-3">
            en {min} min
          </Button>
        ))}
        <Button size="sm" variant="outline" disabled={isDeleting}
          onClick={handleDeleteTests}
          className="rounded-full text-xs h-7 px-3 text-destructive border-destructive/30 hover:bg-destructive/10 ml-auto">
          <Trash2 className="h-3 w-3 mr-1" /> Borrar tests
        </Button>
      </div>
    </div>
  )
}
