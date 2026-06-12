"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Crown, TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react"
import { getTeamFlag } from "@/lib/team-flags"
import { cn } from "@/lib/utils"
import type { Match } from "@/types"

function Flag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo ?? getTeamFlag(name)
  if (!src) return <div className="w-5 h-3.5 rounded-sm bg-muted shrink-0" />
  return <img src={src} alt={name} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
}

interface Member {
  id: string
  user_id: string
  total_points: number
  profiles: {
    full_name: string | null
    nickname: string | null
    avatar_url: string | null
    created_at: string | null
  } | null
}

interface Prediction {
  user_id: string
  match_id: string
  home_score: number
  away_score: number
  points_earned: number | null
}

interface Props {
  members: Member[]
  matches: Match[]
  allPredictions: Prediction[]
  currentUserId: string | null
  ownerId: string
  prevRankMap: Map<string, number>
  allPowerUps: { user_id: string; match_id: string; type: string }[]
}

export function PronoRankingTab({
  members,
  matches,
  allPredictions,
  currentUserId,
  ownerId,
  prevRankMap,
  allPowerUps,
}: Props) {
  const [selected, setSelected] = useState<Member | null>(null)

  const finishedMatches = matches
    .filter(m => m.status === "finished")
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  const doublePointsSet = new Set(
    allPowerUps
      .filter(pu => pu.type === "double_points")
      .map(pu => `${pu.user_id}:${pu.match_id}`)
  )

  // Predictions grouped by user
  const predsByUser = new Map<string, Map<string, Prediction>>()
  for (const p of allPredictions) {
    if (!predsByUser.has(p.user_id)) predsByUser.set(p.user_id, new Map())
    predsByUser.get(p.user_id)!.set(p.match_id, p)
  }

  return (
    <>
      <Card>
        <div className="flex items-center gap-3 px-4 pt-3 pb-1 border-b border-border/50">
          <div className="w-6 shrink-0" />
          <div className="w-9 shrink-0" />
          <div className="flex-1" />
          <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide w-12">Pts</span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide w-12">Exactos</span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide w-12">Efect.</span>
          </div>
          <div className="sm:hidden text-[11px] font-bold text-muted-foreground uppercase tracking-wide w-10 text-right">Pts</div>
        </div>
        <CardContent className="pt-0 divide-y divide-border/50">
          {members.map((member, i) => {
            const isMe = member.user_id === currentUserId
            const initials = member.profiles?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"
            const predByMatch = predsByUser.get(member.user_id) ?? new Map()

            let exactos = 0
            let maxPts = 0
            for (const m of finishedMatches) {
              const pred = predByMatch.get(m.id)
              if (!pred) continue
              const base = m.phase === "groups" ? 10 : 20
              const hasDouble = doublePointsSet.has(`${member.user_id}:${m.id}`)
              maxPts += hasDouble ? base * 2 : base
              if (pred.home_score === m.home_score && pred.away_score === m.away_score) exactos++
            }

            const efectividad = maxPts > 0 ? Math.round((member.total_points / maxPts) * 100) : null
            const currentRank = i + 1
            const prevRank = prevRankMap.get(member.user_id)
            const rankDelta = prevRank != null ? prevRank - currentRank : null

            return (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-3 py-3 cursor-pointer rounded-lg transition-colors hover:bg-muted/40 -mx-1 px-1",
                  isMe && "text-primary"
                )}
                onClick={() => setSelected(member)}
              >
                <div className="w-6 shrink-0 flex flex-col items-center">
                  <span className={`font-black text-base ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : currentRank}
                  </span>
                  {rankDelta !== null && rankDelta !== 0 && (
                    <span className={`flex items-center text-[11px] font-bold leading-none ${rankDelta > 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {rankDelta > 0
                        ? <><TrendingUp className="h-2.5 w-2.5" />+{rankDelta}</>
                        : <><TrendingDown className="h-2.5 w-2.5" />{rankDelta}</>}
                    </span>
                  )}
                  {rankDelta === 0 && prevRank != null && (
                    <Minus className="h-2.5 w-2.5 text-muted-foreground/40" />
                  )}
                </div>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold leading-tight truncate text-sm ${isMe ? "text-primary" : ""}`}>
                    {member.profiles?.full_name ?? "Usuario"}{isMe && <span className="font-normal opacity-60"> (tú)</span>}
                    {member.user_id === ownerId && (
                      <Crown className="h-3 w-3 text-primary inline ml-1 mb-0.5" />
                    )}
                  </p>
                  {member.profiles?.nickname && (
                    <p className="text-xs text-muted-foreground leading-tight truncate">@{member.profiles.nickname}</p>
                  )}
                  <p className="text-xs text-muted-foreground sm:hidden">
                    {exactos > 0 && <span className="text-primary font-semibold">{exactos} exactos</span>}
                    {exactos > 0 && efectividad !== null && " · "}
                    {efectividad !== null && <span>{efectividad}% efect.</span>}
                    {exactos === 0 && efectividad === null && "Sin predicciones aún"}
                  </p>
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
                  <span className="font-black text-base w-12">{member.total_points}</span>
                  <span className="font-bold text-sm w-12 text-primary">{exactos}</span>
                  <span className="font-bold text-sm w-12 text-muted-foreground">
                    {efectividad !== null ? `${efectividad}%` : "—"}
                  </span>
                </div>
                <span className="sm:hidden font-black text-base shrink-0 w-10 text-right">{member.total_points}</span>
              </div>
            )
          })}
          {!members.length && (
            <p className="text-center text-muted-foreground py-8">Nadie ha sumado puntos aún.</p>
          )}
        </CardContent>
      </Card>

      {/* Member predictions modal */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
          {selected && <MemberPredictionsContent
            member={selected}
            finishedMatches={finishedMatches}
            predByMatch={predsByUser.get(selected.user_id) ?? new Map()}
          />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function MemberPredictionsContent({
  member,
  finishedMatches,
  predByMatch,
}: {
  member: Member
  finishedMatches: Match[]
  predByMatch: Map<string, Prediction>
}) {
  const initials = member.profiles?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"
  const joinedDate = member.profiles?.created_at
    ? new Date(member.profiles.created_at).toLocaleDateString("es", { month: "long", year: "numeric" })
    : null

  const predictedMatches = finishedMatches.filter(m => predByMatch.has(m.id))

  return (
    <>
      {/* Header */}
      <DialogHeader className="p-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 shrink-0">
            <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-black leading-tight truncate">
              {member.profiles?.full_name ?? "Usuario"}
            </DialogTitle>
            {member.profiles?.nickname && (
              <p className="text-sm text-muted-foreground">@{member.profiles.nickname}</p>
            )}
            {joinedDate && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <CalendarDays className="h-3 w-3 shrink-0" />
                Miembro desde {joinedDate}
              </p>
            )}
          </div>
        </div>
      </DialogHeader>

      {/* Predictions list */}
      <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
        {predictedMatches.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Sin pronósticos en partidos finalizados.
          </p>
        )}
        {predictedMatches.map(match => {
          const pred = predByMatch.get(match.id)!
          const isExact = pred.home_score === match.home_score && pred.away_score === match.away_score
          const sameDirection =
            Math.sign(match.home_score! - match.away_score!) === Math.sign(pred.home_score - pred.away_score)
          const isCorrect = !isExact && sameDirection

          return (
            <div key={match.id} className={cn(
              "text-xs px-2.5 py-2 rounded-lg",
              isExact ? "bg-emerald-500/10" : isCorrect ? "bg-yellow-500/10" : "bg-muted/40"
            )}>
              {/* Teams + actual score */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                  <span className="truncate font-medium">{match.home_team}</span>
                  <Flag name={match.home_team} logo={match.home_team_logo} />
                </div>
                <span className="font-black w-10 text-center shrink-0">{match.home_score}-{match.away_score}</span>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Flag name={match.away_team} logo={match.away_team_logo} />
                  <span className="truncate font-medium">{match.away_team}</span>
                </div>
              </div>
              {/* Prediction */}
              <div className="flex items-center justify-between mt-0.5 px-0.5">
                <span className="text-muted-foreground">
                  Pronosticó: <span className={cn(
                    "font-bold",
                    isExact ? "text-emerald-600 dark:text-emerald-400" : isCorrect ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"
                  )}>{pred.home_score}-{pred.away_score}</span>
                </span>
                {pred.points_earned != null && (
                  <span className={cn(
                    "font-black",
                    isExact ? "text-emerald-600 dark:text-emerald-400" : isCorrect ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
                  )}>
                    {pred.points_earned > 0 ? `+${pred.points_earned}p` : "0p"}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
