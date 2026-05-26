"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getTeamFlag } from "@/lib/team-flags"
import { savePrediction } from "@/app/actions/predictions"
import { Check, Loader2 } from "lucide-react"
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
}

export function MatchListRow({ match, prediction, userId }: Props) {
  const [home, setHome] = useState(prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? "")
  const [saved, setSaved] = useState(!!prediction)
  const [isPending, startTransition] = useTransition()

  const isLocked = match.status !== "upcoming" || !userId
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - 20)
  const canEdit = !isLocked && new Date() <= deadline

  const handleSave = (h: string, a: string) => {
    if (!userId || h === "" || a === "") return
    startTransition(async () => {
      const res = await savePrediction({
        userId, matchId: match.id, competitionId: match.competition_id,
        homeScore: parseInt(h), awayScore: parseInt(a),
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
    <div className={cn(
      "flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-all",
      match.status === "live" && "border-primary/50 bg-primary/5",
      saved && match.status === "upcoming" && "border-primary/20",
      match.status === "finished" && "border-border/50",
      match.status === "upcoming" && !saved && "border-border/50",
    )}>
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
              onChange={e => { setHome(e.target.value.replace(/\D/g, "").slice(0, 2)); setSaved(false) }}
              onBlur={handleBlur}
              disabled={!canEdit}
              className="w-8 h-8 text-sm font-black rounded-lg border border-input bg-white outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              style={{ textAlign: "center", padding: 0 }}
            />
            <span className="text-muted-foreground font-bold text-xs">-</span>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" value={away}
              onChange={e => { setAway(e.target.value.replace(/\D/g, "").slice(0, 2)); setSaved(false) }}
              onBlur={handleBlur}
              disabled={!canEdit}
              className="w-8 h-8 text-sm font-black rounded-lg border border-input bg-white outline-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
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

      {/* Right side: prediction result or save icon */}
      <div className="shrink-0 flex items-center gap-2">
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
        <Badge variant={statusColors[match.status]} className="text-xs hidden sm:flex">
          {match.status === "live" ? "🔴" : match.status === "finished" ? "Fin." : "Próx."}
        </Badge>
      </div>
    </div>
  )
}
