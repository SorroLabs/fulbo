"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getTeamFlag } from "@/lib/team-flags"
import { savePrediction } from "@/app/actions/predictions"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Match, Prediction } from "@/types"

function TeamFlag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo || getTeamFlag(name)
  if (!src) return <div className="w-10 h-7 rounded bg-muted" />
  return <img src={src} alt={name} className="w-10 h-7 object-cover rounded shadow-sm" style={{ aspectRatio: "4/3" }} />
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

  const SaveIcon = isPending
    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    : saved
      ? <Check className="h-3.5 w-3.5 text-primary" />
      : null

  return (
    <Card className={cn(
      "transition-all",
      match.status === "live" && "border-primary/50 shadow-md shadow-primary/10",
      saved && match.status === "upcoming" && "border-primary/20"
    )}>
      <CardContent className="pt-4 pb-4">
        {/* Date + group + status */}
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

        {/* Teams + score */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamFlag name={match.home_team} logo={match.home_team_logo} />
            <span className="text-sm font-semibold text-center leading-tight">{match.home_team}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {match.status === "finished" ? (
              <div className="flex items-center gap-1.5 font-black text-2xl">
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

        {/* Save icon bottom right */}
        {canEdit && SaveIcon && (
          <div className="flex justify-end mt-2">{SaveIcon}</div>
        )}

        {/* Finished: prediction + points */}
        {match.status === "finished" && (
          <div className="mt-3 flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
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
        )}
      </CardContent>
    </Card>
  )
}
