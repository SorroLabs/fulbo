"use client"

import { useMemo, useState } from "react"
import { MatchDetailDialog, type Member } from "@/components/prono/match-detail-dialog"
import { getTeamFlag } from "@/lib/team-flags"
import type { Match, Prediction, PowerUpUse } from "@/types"

function teamCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 3)
    .toUpperCase()
}

function Flag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo || getTeamFlag(name)
  if (!src) return <span className="rounded-sm bg-muted" style={{ width: 20, height: 14 }} />
  return <img src={src} alt={name} className="rounded-sm shadow-sm object-cover" style={{ width: 20, height: 14 }} />
}

interface Props {
  liveMatches: Match[]
  predictions: Prediction[]
  members: Member[]
  myPowerUps: PowerUpUse[]
  allPowerUps: PowerUpUse[]
  userId: string | null
}

export function LiveMatchesHeader({ liveMatches, predictions, members, myPowerUps, allPowerUps, userId }: Props) {
  const [selected, setSelected] = useState<Match | null>(null)

  const selectedPreds = useMemo(() => {
    if (!selected) return new Map<string, Prediction>()
    const map = new Map<string, Prediction>()
    for (const p of predictions) {
      if (p.match_id === selected.id) map.set(p.user_id, p)
    }
    return map
  }, [predictions, selected])

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

  const currentRanking = useMemo(() =>
    members.map(m => ({ user_id: m.user_id, total_points: m.total_points ?? 0 })),
    [members]
  )

  if (liveMatches.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap justify-center gap-3">
        {liveMatches.map(match => (
          <button
            key={match.id}
            onClick={() => setSelected(match)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/50 shadow-sm shadow-primary/10 px-4 py-2 hover:bg-muted/40 transition-colors shrink-0"
          >
            <span className="text-[10px] font-bold text-primary flex items-center gap-1">🔴 EN VIVO</span>
            <span className="flex items-center gap-2 text-sm">
              <span className="font-bold text-sm">{teamCode(match.home_team)}</span>
              <Flag name={match.home_team} logo={match.home_team_logo} />
              <span className="text-muted-foreground text-xs">vs</span>
              <Flag name={match.away_team} logo={match.away_team_logo} />
              <span className="font-bold text-sm">{teamCode(match.away_team)}</span>
            </span>
          </button>
        ))}
      </div>

      <MatchDetailDialog
        open={!!selected}
        onOpenChange={open => !open && setSelected(null)}
        match={selected}
        members={members}
        preds={selectedPreds}
        powerUpsByUser={selectedPowerUpsByUser}
        currentRanking={currentRanking}
        userId={userId}
        scenarioPowerUps={myPowerUps}
      />
    </>
  )
}
