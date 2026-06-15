"use client"

import { useState, useMemo, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MatchCard } from "@/components/competition/match-card"
import { MatchListRow } from "@/components/competition/match-list-row"
import { MatchFilterBar } from "@/components/competition/match-filter-bar"
import { PowerUpModal } from "@/components/prono/power-up-modal"
import { savePrediction, fillRandomPredictions } from "@/app/actions/predictions"
import { Eye, EyeOff, LayoutGrid, List, TrendingUp, TrendingDown, Minus, Zap, Shield, Clock, Shuffle, ListChecks, Loader2, ChevronDown } from "lucide-react"
import { getTeamFlag } from "@/lib/team-flags"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  computeMatchdays, applyFilters, getAvailableFechas, getAvailableGroups,
  EMPTY_FILTERS, type MatchFilters,
} from "@/lib/match-utils"
import type { Match, Prediction, PowerUpUse } from "@/types"

// ── Scenario calculator ──────────────────────────────────────────────────────

function calcScenarioPts(
  predHome: number, predAway: number,
  scenHome: number, scenAway: number,
  phase: string
): number {
  const mult = phase === "groups" ? 1 : 2
  let pts = 0
  if (
    (predHome > predAway && scenHome > scenAway) ||
    (predHome < predAway && scenHome < scenAway) ||
    (predHome === predAway && scenHome === scenAway)
  ) pts += 5
  if (predHome === scenHome) pts += 2
  if (predAway === scenAway) pts += 2
  if (Math.abs(predHome - predAway) === Math.abs(scenHome - scenAway)) pts += 1
  return pts * mult
}

interface ScenarioProps {
  match: Match
  members: Member[]
  preds: Map<string, Prediction>
  currentRanking: { user_id: string; total_points: number }[]
  userId: string | null
  allPowerUps: PowerUpUse[]
}

function ScenarioCalculator({ match, members, preds, currentRanking, userId, allPowerUps }: ScenarioProps) {
  // Build map: userId -> Set<powerUpType> for this match
  const puByUser = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const pu of allPowerUps) {
      if (pu.match_id !== match.id) continue
      if (!map.has(pu.user_id)) map.set(pu.user_id, new Set())
      map.get(pu.user_id)!.add(pu.type)
    }
    return map
  }, [allPowerUps, match.id])
  const [scenHome, setScenHome] = useState("")
  const [scenAway, setScenAway] = useState("")

  const h = parseInt(scenHome)
  const a = parseInt(scenAway)
  const valid = !isNaN(h) && !isNaN(a) && scenHome !== "" && scenAway !== ""

  const projected = useMemo(() => {
    if (!valid) return null
    return currentRanking
      .map((m, i) => {
        const pred = preds.get(m.user_id)
        const userPus = puByUser.get(m.user_id) ?? new Set()
        let gained = pred?.home_score != null && pred?.away_score != null
          ? calcScenarioPts(pred.home_score, pred.away_score, h, a, match.phase)
          : 0
        // Apply double_points
        if (userPus.has("double_points") && gained > 0) gained *= 2
        // Apply wildcard: if 0 pts, grant base resultado points
        if (userPus.has("wildcard") && gained === 0 && pred != null) {
          gained = 5 * (match.phase === "groups" ? 1 : 2)
        }
        return { ...m, gained, projected: m.total_points + gained, currentRank: i + 1 }
      })
      .sort((a, b) => b.projected - a.projected)
      .map((m, i) => ({ ...m, projectedRank: i + 1 }))
  }, [valid, h, a, currentRanking, preds, match.phase])

  const flag = (name: string) => {
    const src = getTeamFlag(name)
    if (!src) return <div className="w-5 h-3.5 rounded-sm bg-muted shrink-0" />
    return <img src={src} alt={name} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
  }

  const maxPts = match.phase === "groups" ? 10 : 20

  return (
    <div className="space-y-3 pb-3 border-b border-border/50">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">¿Cómo quedaría si termina...?</p>

      {/* Score input */}
      <div className="flex items-center gap-2 justify-center">
        <div className="flex items-center gap-1.5">
          {flag(match.home_team)}
          <span className="text-xs font-semibold text-muted-foreground truncate max-w-[60px]">{match.home_team}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={scenHome}
            onChange={e => setScenHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="0"
            className="w-10 h-10 text-lg font-black rounded-xl border border-input bg-background text-foreground text-center outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <span className="font-black text-muted-foreground">-</span>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={scenAway}
            onChange={e => setScenAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="0"
            className="w-10 h-10 text-lg font-black rounded-xl border border-input bg-background text-foreground text-center outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground truncate max-w-[60px]">{match.away_team}</span>
          {flag(match.away_team)}
        </div>
      </div>

      {/* Projected standings */}
      {valid && projected && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1.5rem_1fr_3rem_3rem_3.5rem] gap-x-2 px-3 py-1.5 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-center">Pred.</span>
            <span className="text-center">+Pts</span>
            <span className="text-right">Total</span>
          </div>
          {projected.map(row => {
            const member = members.find(m => m.user_id === row.user_id)
            const pred = preds.get(row.user_id)
            const isMe = row.user_id === userId
            const delta = row.currentRank - row.projectedRank
            const isExact = row.gained === maxPts
            const name = member?.profiles?.nickname
              ? `@${member.profiles.nickname}`
              : (member?.profiles?.full_name ?? "Usuario")

            return (
              <div
                key={row.user_id}
                className={cn(
                  "grid grid-cols-[1.5rem_1fr_3rem_3rem_3.5rem] gap-x-2 px-3 py-2 items-center text-sm border-t border-border/50",
                  isMe && "bg-primary/5"
                )}
              >
                {/* Rank + delta */}
                <div className="flex items-center gap-0.5">
                  <span className={cn("font-black text-xs", isMe && "text-primary")}>{row.projectedRank}</span>
                  {delta > 0
                    ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                    : delta < 0
                      ? <TrendingDown className="h-3 w-3 text-red-400" />
                      : <Minus className="h-3 w-3 text-muted-foreground/40" />}
                </div>

                {/* Name */}
                <span className={cn("text-xs font-medium truncate", isMe && "text-primary font-bold")}>
                  {name}
                </span>

                {/* Prediction */}
                <span className="text-xs text-center text-muted-foreground font-mono">
                  {pred ? `${pred.home_score}-${pred.away_score}` : "—"}
                </span>

                {/* Points gained */}
                <span className={cn(
                  "text-xs font-black text-center",
                  row.gained === maxPts ? "text-primary" :
                  row.gained > 0 ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {row.gained > 0 ? `+${row.gained}` : "—"}
                  {isExact && " 🎯"}
                </span>

                {/* Projected total */}
                <span className={cn("text-xs font-bold text-right", isMe && "text-primary")}>
                  {row.projected}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {!valid && (
        <p className="text-xs text-center text-muted-foreground py-1">
          Ingresá un marcador para ver cómo quedaría la tabla
        </p>
      )}
    </div>
  )
}

interface Member {
  user_id: string
  total_points?: number
  profiles: { full_name: string | null; nickname: string | null; avatar_url: string | null } | null
}

const POWER_UP_ICONS: Record<string, { icon: typeof Shield; color: string }> = {
  late_change: { icon: Clock, color: "text-blue-500" },
  double_points: { icon: Zap, color: "text-yellow-500" },
  spy: { icon: Eye, color: "text-purple-500" },
  wildcard: { icon: Shield, color: "text-emerald-500" },
}

interface Props {
  matches: Match[]
  members: Member[]
  predictions: Prediction[]
  userId: string | null
  pronoId?: string
  powerUpsEnabled?: boolean
  coinsInProno?: number
  myPowerUps?: PowerUpUse[]
  allPowerUps?: PowerUpUse[]
}

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

function isLocked(match: Match, extendedDeadline = false) {
  if (match.status !== "upcoming") return true
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - (extendedDeadline ? 2 : 20))
  return new Date() > deadline
}

function TeamFlag({ name }: { name: string }) {
  const src = getTeamFlag(name)
  if (!src) return <div className="w-5 h-3.5 rounded-sm bg-muted shrink-0" />
  return <img src={src} alt={name} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
}

export function PronoMatchesTab({ matches, members, predictions, userId, pronoId, powerUpsEnabled, coinsInProno = 0, myPowerUps = [], allPowerUps = [] }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Match | null>(null)
  const [powerUpMatch, setPowerUpMatch] = useState<Match | null>(null)
  const [view, setView] = useState<"grid" | "list">("grid")
  const [finishedExpanded, setFinishedExpanded] = useState(false)
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_FILTERS)
  const [predOverrides, setPredOverrides] = useState<Map<string, { home: number; away: number }>>(new Map())
  const [deletedPredIds, setDeletedPredIds] = useState<Set<string>>(new Set())

  // Random fill state
  const [showRandomConfirm, setShowRandomConfirm] = useState(false)
  const [isFillingRandom, startRandomTransition] = useTransition()

  // Guided fill state
  const [showGuidedFill, setShowGuidedFill] = useState(false)
  const [guidedMatchList, setGuidedMatchList] = useState<Match[]>([])
  const [guidedIndex, setGuidedIndex] = useState(0)
  const [guidedHome, setGuidedHome] = useState("")
  const [guidedAway, setGuidedAway] = useState("")
  const [isSavingGuided, startGuidedTransition] = useTransition()
  const guidedHomeRef = useRef<HTMLInputElement>(null)
  const guidedAwayRef = useRef<HTMLInputElement>(null)

  // Cross-card auto-focus refs
  const homeRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())

  function handlePredSaved(matchId: string, home: number, away: number) {
    setPredOverrides(prev => new Map(prev).set(matchId, { home, away }))
    setDeletedPredIds(prev => { const s = new Set(prev); s.delete(matchId); return s })
  }

  function handlePredDeleted(matchId: string) {
    setDeletedPredIds(prev => new Set([...prev, matchId]))
    setPredOverrides(prev => { const m = new Map(prev); m.delete(matchId); return m })
  }

  // Wildcard uses per phase (for the current user)
  const wildcardsByPhase = useMemo(() => {
    const matchPhaseMap = new Map(matches.map(m => [m.id, m.phase]))
    const counts: Record<string, number> = {}
    for (const pu of myPowerUps) {
      if (pu.type !== "wildcard") continue
      const phase = matchPhaseMap.get(pu.match_id)
      if (!phase) continue
      counts[phase] = (counts[phase] ?? 0) + 1
    }
    return counts
  }, [myPowerUps, matches])

  // Power-up maps
  const myPowerUpsByMatch = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const pu of myPowerUps) {
      if (!map.has(pu.match_id)) map.set(pu.match_id, new Set())
      map.get(pu.match_id)!.add(pu.type)
    }
    return map
  }, [myPowerUps])

  const hasSpy = (matchId: string) => myPowerUpsByMatch.get(matchId)?.has("spy") ?? false
  const hasLateChange = (matchId: string) => myPowerUpsByMatch.get(matchId)?.has("late_change") ?? false

  const spyTargetsByMatch = useMemo(() => {
    const map = new Map<string, string>()
    for (const pu of myPowerUps) {
      if (pu.type === "spy" && pu.target_user_id) map.set(pu.match_id, pu.target_user_id)
    }
    return map
  }, [myPowerUps])

  // Prediction maps
  const predMap = useMemo(() => {
    const map = new Map<string, Map<string, Prediction>>()
    for (const p of predictions) {
      if (!map.has(p.match_id)) map.set(p.match_id, new Map())
      map.get(p.match_id)!.set(p.user_id, p)
    }
    return map
  }, [predictions])

  const myPredMap = useMemo(() => {
    const map = new Map<string, Prediction>()
    if (userId) {
      for (const p of predictions) {
        if (p.user_id === userId && !deletedPredIds.has(p.match_id)) {
          const override = predOverrides.get(p.match_id)
          map.set(p.match_id, override
            ? { ...p, home_score: override.home, away_score: override.away }
            : p)
        }
      }
      // New predictions not yet in server data
      for (const [matchId, override] of predOverrides) {
        if (!map.has(matchId) && !deletedPredIds.has(matchId)) {
          const match = matches.find(m => m.id === matchId)
          if (match) {
            map.set(matchId, {
              id: `local-${matchId}`,
              user_id: userId,
              match_id: matchId,
              prono_id: pronoId ?? "",
              competition_id: match.competition_id,
              home_score: override.home,
              away_score: override.away,
              points_earned: null,
              is_locked: false,
              is_auto: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        }
      }
    }
    return map
  }, [predictions, userId, predOverrides, deletedPredIds, matches, pronoId])

  // Filter utilities
  const matchdays = useMemo(() => computeMatchdays(matches), [matches])
  const predictedIds = useMemo(() => new Set(myPredMap.keys()), [myPredMap])
  const availableFechas = useMemo(() => getAvailableFechas(matches, matchdays), [matches, matchdays])
  const availableGroups = useMemo(() => getAvailableGroups(matches), [matches])

  const filtered = useMemo(
    () => applyFilters(matches, filters, matchdays, predictedIds),
    [matches, filters, matchdays, predictedIds]
  )

  const byPhase = useMemo(() => filtered
    .filter(m => m.status !== "finished")
    .reduce((acc, m) => {
      if (!acc[m.phase]) acc[m.phase] = []
      acc[m.phase].push(m)
      return acc
    }, {} as Record<string, Match[]>), [filtered])

  const finishedByPhase = useMemo(() => filtered
    .filter(m => m.status === "finished")
    .reduce((acc, m) => {
      if (!acc[m.phase]) acc[m.phase] = []
      acc[m.phase].push(m)
      return acc
    }, {} as Record<string, Match[]>), [filtered])

  const finishedCount = useMemo(() =>
    Object.values(finishedByPhase).reduce((sum, ms) => sum + ms.length, 0),
    [finishedByPhase])

  const groupsByFecha = useMemo(() => {
    const map = new Map<number, Match[]>()
    for (const m of byPhase.groups ?? []) {
      const f = matchdays.get(m.id) ?? 0
      if (!map.has(f)) map.set(f, [])
      map.get(f)!.push(m)
    }
    return map
  }, [byPhase.groups, matchdays])

  const selectedPreds = selected ? predMap.get(selected.id) : null

  const selectedPowerUpsByUser = useMemo(() => {
    if (!selected) return new Map<string, Set<string>>()
    const map = new Map<string, Set<string>>()
    for (const pu of allPowerUps) {
      if (pu.match_id !== selected.id) continue
      if (!map.has(pu.user_id)) map.set(pu.user_id, new Set())
      map.get(pu.user_id)!.add(pu.type)
    }
    return map
  }, [allPowerUps, selected])

  // Current ranking derived from members (already sorted by total_points desc)
  const currentRanking = useMemo(() =>
    members.map(m => ({ user_id: m.user_id, total_points: (m as any).total_points ?? 0 })),
    [members]
  )

  // All unpredicted open matches (for random fill + guided fill)
  const unpredictedOpenMatches = useMemo(() =>
    matches
      .filter(m => m.status === "upcoming" && !myPredMap.has(m.id) && !isLocked(m, false))
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()),
    [matches, myPredMap]
  )

  // Ordered list of all non-locked match IDs in render order (for cross-card auto-focus)
  const openMatchIds = useMemo(() => {
    const result: string[] = []
    for (const phase of PHASE_ORDER) {
      const phaseMatches = byPhase[phase] ?? []
      if (!phaseMatches.length) continue
      if (phase !== "groups" && phaseMatches.every(m => m.status === "upcoming")) continue
      if (phase === "groups") {
        const byFechaMap = new Map<number, Match[]>()
        for (const m of phaseMatches) {
          const f = matchdays.get(m.id) ?? 0
          if (!byFechaMap.has(f)) byFechaMap.set(f, [])
          byFechaMap.get(f)!.push(m)
        }
        for (const [, ms] of [...byFechaMap.entries()].sort(([a], [b]) => a - b)) {
          for (const m of ms) {
            const extended = !!(myPowerUpsByMatch.get(m.id)?.has("spy") || myPowerUpsByMatch.get(m.id)?.has("late_change"))
            if (!isLocked(m, extended)) result.push(m.id)
          }
        }
      } else {
        for (const m of phaseMatches) {
          const extended = !!(myPowerUpsByMatch.get(m.id)?.has("spy") || myPowerUpsByMatch.get(m.id)?.has("late_change"))
          if (!isLocked(m, extended)) result.push(m.id)
        }
      }
    }
    return result
  }, [byPhase, matchdays, myPowerUpsByMatch])

  // Auto-focus guided fill home input when match advances
  useEffect(() => {
    if (showGuidedFill) {
      const t = setTimeout(() => guidedHomeRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [guidedIndex, showGuidedFill])

  function handleAwayFilled(matchId: string) {
    const idx = openMatchIds.indexOf(matchId)
    if (idx === -1 || idx >= openMatchIds.length - 1) return
    const nextId = openMatchIds[idx + 1]
    homeRefs.current.get(nextId)?.focus()
  }

  function openGuidedFill() {
    setGuidedMatchList(unpredictedOpenMatches)
    setGuidedIndex(0)
    setGuidedHome("")
    setGuidedAway("")
    setShowGuidedFill(true)
  }

  function handleRandomFill() {
    if (!userId || !pronoId) return
    startRandomTransition(async () => {
      const res = await fillRandomPredictions({
        userId,
        pronoId,
        matchIds: unpredictedOpenMatches.map(m => m.id),
      })
      setShowRandomConfirm(false)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`${res.filled} predicciones generadas`)
        router.refresh()
      }
    })
  }

  function handleGuidedNext() {
    const currentMatch = guidedMatchList[guidedIndex]
    if (!currentMatch || !userId || !pronoId || guidedHome === "" || guidedAway === "") return
    startGuidedTransition(async () => {
      const res = await savePrediction({
        userId,
        matchId: currentMatch.id,
        competitionId: currentMatch.competition_id,
        pronoId,
        homeScore: parseInt(guidedHome),
        awayScore: parseInt(guidedAway),
        isAuto: false,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      handlePredSaved(currentMatch.id, parseInt(guidedHome), parseInt(guidedAway))
      if (guidedIndex >= guidedMatchList.length - 1) {
        setShowGuidedFill(false)
        toast.success("¡Predicciones completadas!")
        router.refresh()
      } else {
        setGuidedIndex(i => i + 1)
        setGuidedHome("")
        setGuidedAway("")
      }
    })
  }

  function handleGuidedSkip() {
    if (guidedIndex >= guidedMatchList.length - 1) {
      setShowGuidedFill(false)
    } else {
      setGuidedIndex(i => i + 1)
      setGuidedHome("")
      setGuidedAway("")
    }
  }

  function renderMatch(match: Match) {
    const spy = hasSpy(match.id)
    const lateChange = hasLateChange(match.id)
    const extendedDeadline = spy || lateChange
    const locked = isLocked(match, extendedDeadline)
    const canUsePowerUps = !!pronoId && !!userId && powerUpsEnabled && match.status === "upcoming"

    const spyTargetId = spyTargetsByMatch.get(match.id)
    const spyPrediction = spyTargetId ? (predMap.get(match.id)?.get(spyTargetId) ?? null) : null
    const spyTargetMember = spyTargetId ? members.find(m => m.user_id === spyTargetId) : null
    const spyTargetName = spyTargetMember?.profiles?.nickname
      ? `@${spyTargetMember.profiles.nickname}`
      : (spyTargetMember?.profiles?.full_name ?? null)

    if (!locked) {
      const eyeOff = (
        <span title="Predicciones visibles 20 minutos antes de iniciar">
          <EyeOff className="h-4 w-4 text-muted-foreground/30" />
        </span>
      )
      if (view === "grid") {
        return (
          <MatchCard
            key={`${match.id}-${myPredMap.get(match.id)?.updated_at ?? 'none'}`} match={match} prediction={myPredMap.get(match.id) ?? null}
            userId={userId} pronoId={pronoId ?? ""} eyeIcon={eyeOff} lateDeadline={extendedDeadline}
            onPowerUp={canUsePowerUps ? () => setPowerUpMatch(match) : undefined}
            onSave={handlePredSaved} onDelete={handlePredDeleted}
            spyPrediction={spyPrediction} spyTargetName={spyTargetName}
            homeInputRef={el => homeRefs.current.set(match.id, el)}
            onAwayFilled={() => handleAwayFilled(match.id)}
          />
        )
      }
      return (
        <MatchListRow
          key={`${match.id}-${myPredMap.get(match.id)?.updated_at ?? 'none'}`} match={match} prediction={myPredMap.get(match.id) ?? null}
          userId={userId} pronoId={pronoId ?? ""} eyeIcon={eyeOff} lateDeadline={extendedDeadline}
          onPowerUp={canUsePowerUps ? () => setPowerUpMatch(match) : undefined}
          onSave={handlePredSaved} onDelete={handlePredDeleted}
          spyPrediction={spyPrediction} spyTargetName={spyTargetName}
          homeInputRef={el => homeRefs.current.set(match.id, el)}
          onAwayFilled={() => handleAwayFilled(match.id)}
        />
      )
    }

    const matchPreds = predMap.get(match.id)
    const myPredLocked = myPredMap.get(match.id)
    const tintTypeLocked = match.status === "finished" && myPredLocked && match.home_score != null && match.away_score != null
      ? myPredLocked.home_score === match.home_score && myPredLocked.away_score === match.away_score
        ? "exact" as const
        : Math.sign(match.home_score - match.away_score) === Math.sign(myPredLocked.home_score - myPredLocked.away_score)
          ? "result" as const
          : "wrong" as const
      : undefined

    if (view === "list") {
      const listDateStr = new Date(match.match_date).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      return (
        <div key={match.id}
          className={cn(
            "flex items-center gap-3 py-2.5 px-3 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer",
            tintTypeLocked && `match-tint-${tintTypeLocked}`,
          )}
          onClick={() => setSelected(match)}
        >
          <div className="hidden sm:flex flex-col items-center w-16 shrink-0">
            <span className="text-xs text-muted-foreground text-center whitespace-nowrap">{listDateStr}</span>
            {match.group_name && <span className="text-xs text-muted-foreground/60">{match.group_name}</span>}
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-sm font-semibold truncate text-right">{match.home_team}</span>
            <TeamFlag name={match.home_team} />
          </div>
          <div className="shrink-0 w-20 flex items-center justify-center">
            <span className="font-black text-lg text-center">
              {match.status === "finished" ? `${match.home_score} - ${match.away_score}` : "vs"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <TeamFlag name={match.away_team} />
            <span className="text-sm font-semibold truncate">{match.away_team}</span>
          </div>
          <div className="shrink-0 w-16 sm:w-28 flex items-center justify-end gap-1.5">
            {canUsePowerUps && (
              <button onClick={e => { e.stopPropagation(); setPowerUpMatch(match) }}
                className="text-primary/60 hover:text-primary transition-colors" title="Power-ups">
                <Zap className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-xs text-muted-foreground">{matchPreds?.size ?? 0}/{members.length}</span>
            <Eye className="h-4 w-4 text-primary" />
          </div>
        </div>
      )
    }

    // Grid locked card
    const dateStr = new Date(match.match_date).toLocaleString("es", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset",
    })
    const myPred = myPredMap.get(match.id)
    const tintType = match.status === "finished" && myPred && match.home_score != null && match.away_score != null
      ? myPred.home_score === match.home_score && myPred.away_score === match.away_score
        ? "exact" as const
        : Math.sign(match.home_score - match.away_score) === Math.sign(myPred.home_score - myPred.away_score)
          ? "result" as const
          : "wrong" as const
      : undefined
    return (
      <button key={match.id} onClick={() => setSelected(match)} className="w-full text-left cursor-pointer hover:scale-[1.01] transition-all rounded-xl">
        <Card className={cn("border-primary/20 hover:border-primary/40 transition-colors", tintType && `match-tint-${tintType}`)}>
          <CardContent>
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs text-muted-foreground min-w-0 truncate">{dateStr}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {match.group_name && <span className="text-xs text-muted-foreground">{match.group_name}</span>}
                <Badge variant={match.status === "finished" ? "outline" : "secondary"} className="text-xs">
                  {match.status === "finished" ? "Finalizado" : "Próximo"}
                </Badge>
                <Eye className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 flex justify-center">
                <img src={getTeamFlag(match.home_team) ?? undefined} alt={match.home_team}
                  className="rounded shadow-sm object-cover" style={{ width: 40, height: 28, flexShrink: 0 }} />
              </div>
              <div className="w-32 shrink-0 flex items-center justify-center" style={{ height: 48 }}>
                <div className="flex items-center gap-1.5 font-black text-2xl">
                  {match.status === "finished" ? (
                    <>
                      <span>{match.home_score}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{match.away_score}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-lg font-bold">vs</span>
                  )}
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <img src={getTeamFlag(match.away_team) ?? undefined} alt={match.away_team}
                  className="rounded shadow-sm object-cover" style={{ width: 40, height: 28, flexShrink: 0 }} />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 flex items-center justify-center text-sm font-semibold text-center leading-tight" style={{ minHeight: "2.5em" }}>{match.home_team}</div>
              <div className="w-32 shrink-0" />
              <div className="flex-1 flex items-center justify-center text-sm font-semibold text-center leading-tight" style={{ minHeight: "2.5em" }}>{match.away_team}</div>
            </div>
            {myPred && (
              <div className="mt-2 flex items-center justify-between bg-muted/50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-muted-foreground">
                  Tu pronóstico: <span className="font-bold text-foreground">{myPred.home_score} - {myPred.away_score}</span>
                </span>
                {myPred.points_earned !== null && (
                  <span className={cn(
                    "text-xs font-black",
                    myPred.points_earned > 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    +{myPred.points_earned} pts
                  </span>
                )}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between" style={{ minHeight: 36 }}>
              {canUsePowerUps ? (
                <button
                  onClick={e => { e.stopPropagation(); setPowerUpMatch(match) }}
                  className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors font-medium"
                >
                  <Zap className="h-3.5 w-3.5" /> Power-ups
                </button>
              ) : <span />}
              <span className="text-xs text-primary/70">
                {matchPreds?.size ?? 0}/{members.length} · tap para ver
              </span>
            </div>
          </CardContent>
        </Card>
      </button>
    )
  }

  function renderSection(ms: Match[]) {
    if (view === "grid") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ms.map(m => renderMatch(m))}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        {ms.map(m => renderMatch(m))}
      </div>
    )
  }

  const hasResults = PHASE_ORDER.some(p => byPhase[p]?.length || finishedByPhase[p]?.length)

  return (
    <>
      <div className="space-y-6">
        {/* Controls */}
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

        {/* Fill shortcuts — only shown to logged-in members with pending predictions */}
        {userId && pronoId && unpredictedOpenMatches.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRandomConfirm(true)} className="gap-1.5 text-xs">
              <Shuffle className="h-3.5 w-3.5" />
              Llenar al azar
              <span className="text-muted-foreground">({unpredictedOpenMatches.length})</span>
            </Button>
            <Button variant="outline" size="sm" onClick={openGuidedFill} className="gap-1.5 text-xs">
              <ListChecks className="h-3.5 w-3.5" />
              Llenado paso a paso
            </Button>
          </div>
        )}

        {/* Finished matches — collapsible */}
        {finishedCount > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setFinishedExpanded(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", finishedExpanded && "rotate-180")} />
              {finishedCount} {finishedCount === 1 ? "partido finalizado" : "partidos finalizados"}
            </button>
            {finishedExpanded && (
              <div className="space-y-4">
                {PHASE_ORDER.filter(p => finishedByPhase[p]?.length).map(phase => (
                  <div key={phase} className="space-y-4">
                    {phase === "groups" ? (
                      filters.fecha !== null ? (
                        renderSection(finishedByPhase.groups)
                      ) : (
                        (() => {
                          const byFecha = new Map<number, Match[]>()
                          for (const m of finishedByPhase.groups) {
                            const f = matchdays.get(m.id) ?? 0
                            if (!byFecha.has(f)) byFecha.set(f, [])
                            byFecha.get(f)!.push(m)
                          }
                          return [...byFecha.entries()].sort(([a], [b]) => a - b).map(([fecha, ms]) => (
                            <div key={fecha}>
                              <h3 className="font-bold text-lg mb-3">
                                <Badge variant="outline" className="text-primary border-primary/30">Fecha {fecha}</Badge>
                              </h3>
                              {renderSection(ms)}
                            </div>
                          ))
                        })()
                      )
                    ) : (
                      <div>
                        <h3 className="font-bold text-lg mb-3">
                          <Badge variant="outline" className="text-primary border-primary/30">{PHASE_LABELS[phase]}</Badge>
                        </h3>
                        {renderSection(finishedByPhase[phase])}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Open / live matches by phase */}
        {PHASE_ORDER.filter(p => {
          if (!byPhase[p]?.length) return false
          if (p !== "groups" && byPhase[p].every(m => m.status === "upcoming")) return false
          return true
        }).map(phase => (
          <div key={phase} className="space-y-4">
            {phase === "groups" ? (
              filters.fecha !== null ? (
                renderSection(byPhase.groups)
              ) : (
                [...groupsByFecha.entries()].sort(([a], [b]) => a - b).map(([fecha, ms]) => (
                  <div key={fecha}>
                    <h3 className="font-bold text-lg mb-3">
                      <Badge variant="outline" className="text-primary border-primary/30">Fecha {fecha}</Badge>
                    </h3>
                    {renderSection(ms)}
                  </div>
                ))
              )
            ) : (
              <div>
                <h3 className="font-bold text-lg mb-3">
                  <Badge variant="outline" className="text-primary border-primary/30">{PHASE_LABELS[phase]}</Badge>
                </h3>
                {renderSection(byPhase[phase])}
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

      {pronoId && userId && powerUpMatch && (
        <PowerUpModal
          open={!!powerUpMatch}
          onClose={() => setPowerUpMatch(null)}
          match={powerUpMatch}
          pronoId={pronoId}
          coinsInProno={coinsInProno}
          myPowerUps={myPowerUps.filter(p => p.match_id === powerUpMatch.id)}
          members={members}
          userId={userId}
          wildcardsByPhase={wildcardsByPhase}
          onSuccess={() => router.refresh()}
        />
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <TeamFlag name={selected.home_team} />
                      <span className="font-bold text-sm">{selected.home_team}</span>
                    </div>
                    <span className="font-black text-lg px-1">
                      {selected.status === "finished" ? `${selected.home_score} - ${selected.away_score}` : "vs"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{selected.away_team}</span>
                      <TeamFlag name={selected.away_team} />
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              {(selected.status === "live" ||
                (selected.status !== "finished" && new Date() >= new Date(selected.match_date))) && (
                <ScenarioCalculator
                  match={selected}
                  members={members}
                  preds={selectedPreds ?? new Map()}
                  currentRanking={currentRanking}
                  userId={userId}
                  allPowerUps={myPowerUps}
                />
              )}

              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 pb-1">Predicciones</p>
              <div className="divide-y divide-border/50">
                {members.map(member => {
                  const pred = selectedPreds?.get(member.user_id)
                  const initials = (member.profiles?.full_name ?? member.profiles?.nickname ?? "?")
                    .split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                  const displayName = member.profiles?.nickname
                    ? `@${member.profiles.nickname}`
                    : (member.profiles?.full_name ?? "Usuario")
                  const isMe = member.user_id === userId
                  return (
                    <div key={member.user_id} className={cn("flex items-center gap-3 py-3", isMe && "text-primary")}>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium truncate flex items-center gap-1 min-w-0">
                        <span className="truncate">{displayName}{isMe && " (vos)"}</span>
                        {(() => {
                          const userPus = selectedPowerUpsByUser.get(member.user_id) ?? new Set<string>()
                          const icons: React.ReactNode[] = []
                          // Show wildcard only if it actually fired (base pts = 0 but earned > 0)
                          if (userPus.has("wildcard") && pred && pred.points_earned !== null) {
                            const basePts = selected?.status === "finished" && selected.home_score != null && selected.away_score != null
                              ? calcScenarioPts(pred.home_score, pred.away_score, selected.home_score, selected.away_score, selected.phase)
                              : pred.points_earned
                            if (basePts === 0 && pred.points_earned > 0) {
                              const { icon: Icon, color } = POWER_UP_ICONS.wildcard
                              icons.push(<Icon key="wildcard" className={`h-3 w-3 shrink-0 ${color}`} />)
                            }
                          }
                          for (const type of ["late_change", "double_points", "spy"] as const) {
                            if (userPus.has(type)) {
                              const { icon: Icon, color } = POWER_UP_ICONS[type]
                              icons.push(<Icon key={type} className={`h-3 w-3 shrink-0 ${color}`} />)
                            }
                          }
                          return icons
                        })()}
                      </span>
                      {pred ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-base">{pred.home_score} - {pred.away_score}</span>
                          {pred.points_earned !== null && (
                            <span className={cn(
                              "text-xs font-bold px-1.5 py-0.5 rounded-full",
                              pred.points_earned > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              +{pred.points_earned}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">Sin predicción</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Random fill confirmation */}
      <Dialog open={showRandomConfirm} onOpenChange={open => !open && setShowRandomConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Llenar predicciones al azar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se generarán <strong>{unpredictedOpenMatches.length} predicciones</strong> con marcadores aleatorios (0–4) para todos los partidos abiertos sin predicción.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRandomConfirm(false)} disabled={isFillingRandom}>
              Cancelar
            </Button>
            <Button onClick={handleRandomFill} disabled={isFillingRandom}>
              {isFillingRandom ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guided fill modal */}
      <Dialog open={showGuidedFill} onOpenChange={open => !open && setShowGuidedFill(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-bold">
              Completar paso a paso · {guidedMatchList.length > 0 ? `${guidedIndex + 1} / ${guidedMatchList.length}` : "0"}
            </DialogTitle>
          </DialogHeader>

          {guidedMatchList.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Sin partidos pendientes.</p>
          ) : (() => {
            const currentMatch = guidedMatchList[guidedIndex]
            if (!currentMatch) return null
            const isLastMatch = guidedIndex >= guidedMatchList.length - 1
            const dateStr = new Date(currentMatch.match_date).toLocaleString("es", {
              weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })
            return (
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${(guidedIndex / guidedMatchList.length) * 100}%` }}
                  />
                </div>

                {/* Match info */}
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <TeamFlag name={currentMatch.home_team} />
                      <span className="text-xs font-semibold text-center leading-tight max-w-[72px]">{currentMatch.home_team}</span>
                    </div>
                    <span className="text-muted-foreground font-bold text-sm">vs</span>
                    <div className="flex flex-col items-center gap-1">
                      <TeamFlag name={currentMatch.away_team} />
                      <span className="text-xs font-semibold text-center leading-tight max-w-[72px]">{currentMatch.away_team}</span>
                    </div>
                  </div>
                </div>

                {/* Score inputs */}
                <div className="flex items-center justify-center gap-3">
                  <input
                    ref={guidedHomeRef}
                    type="text" inputMode="numeric" pattern="[0-9]*" value={guidedHome}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/\D/g, "").slice(0, 2)
                      setGuidedHome(cleaned)
                      if (cleaned.length === 1) { guidedAwayRef.current?.focus(); guidedAwayRef.current?.select() }
                    }}
                    placeholder="0"
                    className="w-14 h-14 text-2xl font-black rounded-xl border border-input bg-background text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    style={{ textAlign: "center", padding: 0 }}
                  />
                  <span className="text-muted-foreground font-bold text-xl">-</span>
                  <input
                    ref={guidedAwayRef}
                    type="text" inputMode="numeric" pattern="[0-9]*" value={guidedAway}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/\D/g, "").slice(0, 2)
                      setGuidedAway(cleaned)
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && guidedHome !== "" && guidedAway !== "") {
                        e.preventDefault()
                        handleGuidedNext()
                      }
                    }}
                    placeholder="0"
                    className="w-14 h-14 text-2xl font-black rounded-xl border border-input bg-background text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    style={{ textAlign: "center", padding: 0 }}
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowGuidedFill(false); router.refresh() }}>
                    Salir
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGuidedSkip} disabled={isSavingGuided}>
                    Saltar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGuidedNext}
                    disabled={guidedHome === "" || guidedAway === "" || isSavingGuided}
                  >
                    {isSavingGuided
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : isLastMatch ? "Guardar" : "Siguiente"}
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
