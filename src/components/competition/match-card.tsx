"use client"

import { useState, useTransition } from "react"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getTeamFlag } from "@/lib/team-flags"
import { savePrediction, deletePrediction } from "@/app/actions/predictions"
import { Check, Loader2, Zap } from "lucide-react"
import { toast } from "sonner"
import type { Match, Prediction } from "@/types"

function TeamFlag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo || getTeamFlag(name)
  if (!src) return <div className="rounded bg-muted" style={{ width: 40, height: 28, flexShrink: 0 }} />
  return (
    <img
      src={src}
      alt={name}
      className="rounded shadow-sm object-cover"
      style={{ width: 40, height: 28, flexShrink: 0 }}
    />
  )
}

interface MatchCardProps {
  match: Match
  prediction: Prediction | null
  userId: string | null
  pronoId: string
  eyeIcon?: React.ReactNode
  onPowerUp?: () => void
  lateDeadline?: boolean
  onSave?: (matchId: string, home: number, away: number) => void
  onDelete?: (matchId: string) => void
}

export function MatchCard({ match, prediction, userId, pronoId, eyeIcon, onPowerUp, lateDeadline, onSave, onDelete }: MatchCardProps) {
  const [home, setHome] = useState(prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? "")
  const [saved, setSaved] = useState(!!prediction)
  const [isPending, startTransition] = useTransition()

  const isLocked = match.status !== "upcoming" || !userId
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - (lateDeadline ? 2 : 20))
  const isPastDeadline = new Date() > deadline
  const canEdit = !isLocked && !isPastDeadline

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
    if (home !== "" && away !== "") handleSave(home, away)
    else if (home === "" && away === "" && saved) handleDelete()
  }

  const statusColors = { upcoming: "secondary", live: "default", finished: "outline" } as const

  const dateStr = new Date(match.match_date).toLocaleString("es", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset",
  })

  const tintType = match.status === "finished" && prediction && match.home_score != null && match.away_score != null
    ? prediction.home_score === match.home_score && prediction.away_score === match.away_score
      ? "exact" as const
      : Math.sign(match.home_score - match.away_score) === Math.sign(prediction.home_score - prediction.away_score)
        ? "result" as const
        : "wrong" as const
    : undefined

  return (
    <Card
      className={cn(
        "transition-all",
        match.status === "live" && "border-primary/50 shadow-md shadow-primary/10",
        saved && match.status === "upcoming" && "border-primary/20",
        tintType && `match-tint-${tintType}`,
      )}
    >
      <CardContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <span className="text-xs text-muted-foreground min-w-0 truncate">{dateStr}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {match.group_name && <span className="text-xs text-muted-foreground">{match.group_name}</span>}
            <Badge variant={statusColors[match.status]} className="text-xs">
              {match.status === "live" ? "🔴 EN VIVO" : match.status === "finished" ? "Finalizado" : "Próximo"}
            </Badge>
            {eyeIcon}
          </div>
        </div>

        {/* Flags + score (same row so flags always align with score) */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 flex justify-center">
            <TeamFlag name={match.home_team} logo={match.home_team_logo} />
          </div>
          <div className="w-32 shrink-0 flex items-center justify-center" style={{ height: 48 }}>
            {match.status === "finished" ? (
              <div className="flex items-center gap-1.5 font-black text-2xl">
                <span>{match.home_score}</span>
                <span className="text-muted-foreground">-</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" value={home}
                  onChange={e => { setHome(e.target.value.replace(/\D/g, "").slice(0, 2)); setSaved(false) }}
                  onBlur={handleBlur}
                  disabled={!canEdit}
                  className="w-12 h-12 text-lg font-black rounded-xl border border-input bg-background text-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{ textAlign: "center", padding: 0 }}
                />
                <span className="text-muted-foreground font-bold">-</span>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" value={away}
                  onChange={e => { setAway(e.target.value.replace(/\D/g, "").slice(0, 2)); setSaved(false) }}
                  onBlur={handleBlur}
                  disabled={!canEdit}
                  className="w-12 h-12 text-lg font-black rounded-xl border border-input bg-background text-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{ textAlign: "center", padding: 0 }}
                />
              </div>
            )}
          </div>
          <div className="flex-1 flex justify-center">
            <TeamFlag name={match.away_team} logo={match.away_team_logo} />
          </div>
        </div>
        {/* Names row — div+flex centers text vertically so blank space (1-line names) is distributed evenly */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center justify-center text-sm font-semibold text-center leading-tight" style={{ minHeight: "2.5em" }}>{match.home_team}</div>
          <div className="w-32 shrink-0" />
          <div className="flex-1 flex items-center justify-center text-sm font-semibold text-center leading-tight" style={{ minHeight: "2.5em" }}>{match.away_team}</div>
        </div>

        {/* Footer — always 36px tall to keep all cards uniform */}
        <div className="mt-3 flex items-center" style={{ minHeight: 36 }}>
          {match.status === "finished" ? (
            <div className="w-full flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              {prediction ? (
                <>
                  <span className="text-xs text-muted-foreground">
                    Tu pronóstico: <span className="font-bold text-foreground">{prediction.home_score} - {prediction.away_score}</span>
                  </span>
                  <span className={cn(
                    "text-sm font-black",
                    prediction.points_earned === null ? "text-muted-foreground" :
                    prediction.points_earned > 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {prediction.points_earned === null ? "—" : `+${prediction.points_earned} pts`}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">Sin pronóstico</span>
              )}
            </div>
          ) : (
            <div className="w-full flex items-center justify-between" style={{ minHeight: 36 }}>
              {onPowerUp ? (
                <button
                  onClick={onPowerUp}
                  className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors font-medium"
                >
                  <Zap className="h-3.5 w-3.5" /> Power-ups
                </button>
              ) : <span />}
              {canEdit && (
                isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  : saved
                    ? <Check className="h-3.5 w-3.5 text-primary" />
                    : null
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
