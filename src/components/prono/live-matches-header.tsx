"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MatchCard } from "@/components/competition/match-card"
import { getTeamFlag } from "@/lib/team-flags"
import type { Match, Prediction } from "@/types"

function TeamCode({ name, logo }: { name: string; logo: string | null }) {
  const src = logo || getTeamFlag(name)
  const code = name.slice(0, 3).toUpperCase()
  return (
    <span className="flex items-center gap-1.5">
      {src
        ? <img src={src} alt={name} className="rounded-sm shadow-sm object-cover" style={{ width: 20, height: 14 }} />
        : <span className="rounded-sm bg-muted" style={{ width: 20, height: 14 }} />}
      <span className="font-bold text-sm">{code}</span>
    </span>
  )
}

interface Props {
  liveMatches: Match[]
  predictions: Prediction[]
  userId: string | null
  pronoId: string
}

export function LiveMatchesHeader({ liveMatches, predictions, userId, pronoId }: Props) {
  const [selected, setSelected] = useState<Match | null>(null)

  if (liveMatches.length === 0) return null

  const myPrediction = (matchId: string) =>
    predictions.find(p => p.match_id === matchId && p.user_id === userId) ?? null

  return (
    <>
      <div className="flex flex-wrap justify-center gap-3">
        {liveMatches.map(match => (
          <button
            key={match.id}
            onClick={() => setSelected(match)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/50 shadow-sm shadow-primary/10 px-3 py-2 hover:bg-muted/40 transition-colors basis-[calc(33.333%-0.5rem)] grow-0 shrink-0"
          >
            <span className="text-[10px] font-bold text-primary flex items-center gap-1">🔴 EN VIVO</span>
            <span className="flex items-center gap-1.5 text-sm">
              <TeamCode name={match.home_team} logo={match.home_team_logo} />
              <span className="text-muted-foreground text-xs">vs</span>
              <TeamCode name={match.away_team} logo={match.away_team_logo} />
            </span>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-center">Partido en vivo</DialogTitle>
          </DialogHeader>
          {selected && (
            <MatchCard
              match={selected}
              prediction={myPrediction(selected.id)}
              userId={userId}
              pronoId={pronoId}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
