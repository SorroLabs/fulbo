"use client"

import { useState, useTransition, useRef } from "react"
import type React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getTeamFlag } from "@/lib/team-flags"
import { savePrediction, deletePrediction } from "@/app/actions/predictions"
import { Check, Loader2, Zap } from "lucide-react"
import { toast } from "sonner"
import type { Match, Prediction } from "@/types"

function Flag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo || getTeamFlag(name)
  if (!src) return <div className="w-6 h-4 rounded-sm bg-muted shrink-0" />
  return <img src={src} alt={name} className="w-6 h-4 object-cover rounded-sm shrink-0" />
}

interface Props {
  match: Match
  prediction: Prediction | null
  userId: string | null
  pronoId: string
  eyeIcon?: React.ReactNode
  onPowerUp?: () => void
  lateDeadline?: boolean
  onSave?: (matchId: string, home: number, away: number) => void
  onDelete?: (matchId: string) => void
  spyPrediction?: { home_score: number; away_score: number } | null
  spyTargetName?: string | null
  homeInputRef?: (el: HTMLInputElement | null) => void
  onAwayFilled?: () => void
}

export function MatchListRow({ match, prediction, userId, pronoId, eyeIcon, onPowerUp, lateDeadline, onSave, onDelete, spyPrediction, spyTargetName, homeInputRef, onAwayFilled }: Props) {
  const [home, setHome] = useState(prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? "")
  const [saved, setSaved] = useState(!!prediction)
  const [isPending, startTransition] = useTransition()
  const awayRef = useRef<HTMLInputElement>(null)
  const latestHome = useRef(prediction?.home_score?.toString() ?? "")
  const latestAway = useRef(prediction?.away_score?.toString() ?? "")

  const isLocked = match.status !== "upcoming" || !userId
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - (lateDeadline ? 2 : 20))
  const canEdit = !isLocked && new Date() <= deadline

  const handleSave = (h: string, a: string) => {
    if (!userId || h === "" || a === "") return
    startTransition(async () => {
      const res = await savePrediction({
        userId, matchId: match.id, competitionId: match.competition_id, pronoId,
        homeScore: parseInt(h), awayScore: parseInt(a),
      })
      if (res.error) toast.error(res.error)
      else {
        setSaved(true)
        onSave?.(match.id, parseInt(h), parseInt(a))
      }
    })
  }

  const handleDelete = () => {
    if (!userId) return
    startTransition(async () => {
      const res = await deletePrediction({ userId, matchId: match.id, pronoId })
      if (res.error) toast.error(res.error)
      else {
        setSaved(false)
        onDelete?.(match.id)
      }
    })
  }

  const handleBlur = () => {
    if (latestHome.current !== "" && latestAway.current !== "") handleSave(latestHome.current, latestAway.current)
    else if (latestHome.current === "" && latestAway.current === "" && !!prediction) handleDelete()
  }

  const statusColors = { upcoming: "secondary", live: "default", finished: "outline" } as const

  const tintType = match.status === "finished" && prediction && match.home_score != null && match.away_score != null
    ? prediction.home_score === match.home_score && prediction.away_score === match.away_score
      ? "exact" as const
      : Math.sign(match.home_score - match.away_score) === Math.sign(prediction.home_score - prediction.away_score)
        ? "result" as const
        : "wrong" as const
    : undefined

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border transition-all",
        match.status === "live" && "border-primary/50 bg-primary/5",
        saved && match.status === "upcoming" && "border-primary/20",
        (match.status === "finished" || (match.status === "upcoming" && !saved)) && "border-border/50",
        tintType && `match-tint-${tintType}`,
      )}
    >
    <div className="flex items-center gap-3 py-2.5 px-3">
      {/* Date + group */}
      <div className="hidden sm:flex flex-col items-center w-16 shrink-0">
        <span className="text-xs text-muted-foreground text-center whitespace-nowrap">
          {new Date(match.match_date).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
        {match.group_name && <span className="text-xs text-muted-foreground/60">{match.group_name}</span>}
      </div>

      {/* Home team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-sm font-semibold truncate text-right">{match.home_team}</span>
        <Flag name={match.home_team} logo={match.home_team_logo} />
      </div>

      {/* Score / inputs — fixed width so dash always centers */}
      <div className="shrink-0 w-20 flex items-center justify-center gap-1">
        {match.status === "finished" ? (
          <span className="font-black text-lg text-center">
            {match.home_score} - {match.away_score}
          </span>
        ) : (
          <>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" value={home}
              ref={homeInputRef}
              onChange={e => {
                const cleaned = e.target.value.replace(/\D/g, "").slice(0, 2)
                latestHome.current = cleaned
                setHome(cleaned)
                setSaved(false)
                if (cleaned.length === 1) { awayRef.current?.focus(); awayRef.current?.select() }
              }}
              onBlur={handleBlur}
              disabled={!canEdit}
              className="w-8 h-8 text-sm font-black rounded-lg border border-input bg-background text-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              style={{ textAlign: "center", padding: 0 }}
            />
            <span className="text-muted-foreground font-bold text-xs">-</span>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" value={away}
              ref={awayRef}
              onChange={e => {
                const cleaned = e.target.value.replace(/\D/g, "").slice(0, 2)
                latestAway.current = cleaned
                setAway(cleaned)
                setSaved(false)
                if (cleaned.length === 1) onAwayFilled?.()
              }}
              onBlur={handleBlur}
              disabled={!canEdit}
              className="w-8 h-8 text-sm font-black rounded-lg border border-input bg-background text-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              style={{ textAlign: "center", padding: 0 }}
            />
          </>
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Flag name={match.away_team} logo={match.away_team_logo} />
        <span className="text-sm font-semibold truncate">{match.away_team}</span>
      </div>

      {/* Right side: fixed width so score column stays centered across all rows */}
      <div className="shrink-0 w-16 sm:w-28 flex items-center justify-end gap-1.5">
        {match.status === "finished" && prediction ? (
          <>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {prediction.home_score}-{prediction.away_score}
            </span>
            <span className={cn(
              "text-xs font-black min-w-[2.5rem] text-right",
              prediction.points_earned === null ? "text-muted-foreground" :
              prediction.points_earned > 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {prediction.points_earned === null ? "—" : `+${prediction.points_earned}p`}
            </span>
          </>
        ) : match.status === "finished" ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : canEdit ? (
          isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            : saved
              ? <Check className="h-3.5 w-3.5 text-primary" />
              : null
        ) : null}
        {onPowerUp && (
          <button onClick={onPowerUp} className="text-primary/60 hover:text-primary transition-colors" title="Power-ups">
            <Zap className="h-3.5 w-3.5" />
          </button>
        )}
        <Badge variant={statusColors[match.status]} className="text-xs hidden sm:flex">
          {match.status === "live" ? "🔴" : match.status === "finished" ? "Fin." : "Próx."}
        </Badge>
        {eyeIcon}
      </div>
      </div>
      {/* Spy reveal — second row, doesn't affect score centering */}
      {spyPrediction && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-amber-500/20 bg-amber-500/5 rounded-b-xl text-xs">
          <span>🕵️</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium flex-1 truncate">{spyTargetName ?? "Rival"}</span>
          <span className="font-black text-amber-600 dark:text-amber-400">{spyPrediction.home_score} - {spyPrediction.away_score}</span>
        </div>
      )}
      {spyPrediction === null && spyTargetName && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-amber-500/20 bg-amber-500/5 rounded-b-xl text-xs">
          <span>🕵️</span>
          <span className="text-amber-600 dark:text-amber-400 italic">{spyTargetName} aún no pronosticó</span>
        </div>
      )}
    </div>
  )
}
