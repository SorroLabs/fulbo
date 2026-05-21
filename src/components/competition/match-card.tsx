"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { PHASE_MULTIPLIERS } from "@/types"
import { savePrediction } from "@/app/actions/predictions"
import { toast } from "sonner"
import type { Match, Prediction } from "@/types"

interface MatchCardProps {
  match: Match
  prediction: Prediction | null
  userId: string | null
}

export function MatchCard({ match, prediction, userId }: MatchCardProps) {
  const [home, setHome] = useState(prediction?.home_score?.toString() ?? "")
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? "")
  const [isPending, startTransition] = useTransition()

  const isLocked = match.status !== "upcoming" || !userId
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - 10)
  const isPastDeadline = new Date() > deadline

  const pts = PHASE_MULTIPLIERS[match.phase]

  const handleSave = () => {
    if (!userId || home === "" || away === "") return
    startTransition(async () => {
      const res = await savePrediction({
        userId,
        matchId: match.id,
        competitionId: match.competition_id,
        homeScore: parseInt(home),
        awayScore: parseInt(away),
      })
      if (res.error) toast.error(res.error)
      else toast.success("Predicción guardada")
    })
  }

  const statusColors = {
    upcoming: "secondary",
    live: "default",
    finished: "outline",
  } as const

  return (
    <Card className={cn(
      "transition-all",
      match.status === "live" && "border-primary/50 shadow-md shadow-primary/10",
      prediction && match.status === "upcoming" && "border-primary/20"
    )}>
      <CardContent className="pt-4 pb-4">
        {/* Phase + date */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
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
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.home_team_logo && <img src={match.home_team_logo} alt="" className="w-8 h-8 object-contain" />}
            <span className="text-sm font-semibold text-center leading-tight">{match.home_team}</span>
          </div>

          {/* Score / prediction inputs */}
          <div className="flex items-center gap-2 shrink-0">
            {match.status === "finished" ? (
              <div className="flex items-center gap-1.5 font-black text-xl">
                <span>{match.home_score}</span>
                <span className="text-muted-foreground">-</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={home}
                  onChange={e => setHome(e.target.value)}
                  disabled={isLocked || isPastDeadline}
                  className="w-12 h-12 text-center text-lg font-black p-0 rounded-xl"
                />
                <span className="text-muted-foreground font-bold">-</span>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={away}
                  onChange={e => setAway(e.target.value)}
                  disabled={isLocked || isPastDeadline}
                  className="w-12 h-12 text-center text-lg font-black p-0 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {match.away_team_logo && <img src={match.away_team_logo} alt="" className="w-8 h-8 object-contain" />}
            <span className="text-sm font-semibold text-center leading-tight">{match.away_team}</span>
          </div>
        </div>

        {/* Points hint + save */}
        {match.status === "upcoming" && !isPastDeadline && userId && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Exacto: <span className="text-primary font-bold">{pts.exact}pts</span> · Resultado: <span className="font-bold">{pts.result}pts</span>
            </span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || home === "" || away === ""}
              className="rounded-full h-8 px-4 text-xs font-bold"
            >
              {isPending ? "Guardando..." : prediction ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        )}

        {/* Prediction result */}
        {match.status === "finished" && prediction && (
          <div className="mt-3 flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Tu predicción: <span className="font-bold text-foreground">{prediction.home_score} - {prediction.away_score}</span>
            </span>
            {prediction.points_earned !== null && (
              <span className={cn(
                "text-sm font-black",
                prediction.points_earned > 0 ? "text-primary" : "text-muted-foreground"
              )}>
                +{prediction.points_earned} pts
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
