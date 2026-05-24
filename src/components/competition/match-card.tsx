"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PHASE_MULTIPLIERS } from "@/types"
import { getTeamFlag } from "@/lib/team-flags"
import { savePrediction } from "@/app/actions/predictions"
import { toast } from "sonner"
import type { Match, Prediction } from "@/types"

function TeamFlag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo || getTeamFlag(name)
  if (!src) return <div className="w-10 h-7 rounded bg-muted" />
  return (
    <img src={src} alt={name} className="w-10 h-7 object-cover rounded shadow-sm" style={{ aspectRatio: "4/3" }} />
  )
}

interface MatchCardProps {
  match: Match
  prediction: Prediction | null
  userId: string | null
}

export function MatchCard({ match, prediction, userId }: MatchCardProps) {
  const [home, setHome] = useState(prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? "")
  const [saved, setSaved] = useState(!!prediction)
  const [isPending, startTransition] = useTransition()

  const isLocked = match.status !== "upcoming" || !userId
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - 20)
  const isPastDeadline = new Date() > deadline
  const canEdit = !isLocked && !isPastDeadline

  const pts = PHASE_MULTIPLIERS[match.phase]

  const handleSave = (h: string, a: string) => {
    if (!userId || h === "" || a === "") return
    startTransition(async () => {
      const res = await savePrediction({
        userId,
        matchId: match.id,
        competitionId: match.competition_id,
        homeScore: parseInt(h),
        awayScore: parseInt(a),
      })
      if (res.error) toast.error(res.error)
      else setSaved(true)
    })
  }

  const handleBlur = () => {
    if (home !== "" && away !== "") handleSave(home, away)
  }

  const statusColors = { upcoming: "secondary", live: "default", finished: "outline" } as const

  return (
    <Card className={cn(
      "transition-all",
      match.status === "live" && "border-primary/50 shadow-md shadow-primary/10",
      saved && match.status === "upcoming" && "border-primary/20"
    )}>
      <CardContent className="pt-4 pb-4">
        {/* Date + group */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {new Date(match.match_date).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}
          </span>
          <div className="flex items-center gap-2">
            {match.group_name && <span className="text-xs text-muted-foreground">{match.group_name}</span>}
            <Badge variant={statusColors[match.status]} className="text-xs">
              {match.status === "live" ? "🔴 EN VIVO" : match.status === "finished" ? "Finalizado" : "Próximo"}
            </Badge>
          </div>
        </div>

        {/* Teams + inputs */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamFlag name={match.home_team} logo={match.home_team_logo} />
            <span className="text-sm font-semibold text-center leading-tight">{match.home_team}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {match.status === "finished" ? (
              <div className="flex items-center gap-1.5 font-black text-xl">
                <span>{match.home_score}</span>
                <span className="text-muted-foreground">-</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={20} value={home}
                  onChange={e => { setHome(e.target.value); setSaved(false) }}
                  onBlur={handleBlur}
                  disabled={!canEdit}
                  className="w-12 h-12 text-lg font-black rounded-xl border border-input bg-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{ textAlign: "center", padding: 0 }}
                />
                <span className="text-muted-foreground font-bold">-</span>
                <input
                  type="number" min={0} max={20} value={away}
                  onChange={e => { setAway(e.target.value); setSaved(false) }}
                  onBlur={handleBlur}
                  disabled={!canEdit}
                  className="w-12 h-12 text-lg font-black rounded-xl border border-input bg-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{ textAlign: "center", padding: 0 }}
                />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamFlag name={match.away_team} logo={match.away_team_logo} />
            <span className="text-sm font-semibold text-center leading-tight">{match.away_team}</span>
          </div>
        </div>

        {/* Points hint + save status */}
        {canEdit && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Exacto: <span className="text-primary font-bold">{pts.exact}pts</span> · Resultado: <span className="font-bold">{pts.result}pts</span>
            </span>
            <span className={cn("text-xs transition-all", saved && !isPending ? "text-primary font-semibold" : "text-muted-foreground")}>
              {isPending ? "Guardando..." : saved ? "✓ Guardado" : "Completá los dos campos"}
            </span>
          </div>
        )}

        {/* Prediction result (finished) */}
        {match.status === "finished" && prediction && (
          <div className="mt-3 flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Tu predicción: <span className="font-bold text-foreground">{prediction.home_score} - {prediction.away_score}</span>
            </span>
            {prediction.points_earned !== null && (
              <span className={cn("text-sm font-black", prediction.points_earned > 0 ? "text-primary" : "text-muted-foreground")}>
                +{prediction.points_earned} pts
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
