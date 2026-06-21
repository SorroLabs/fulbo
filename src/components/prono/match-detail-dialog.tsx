"use client"

import { useMemo, useState } from "react"
import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, Minus, Zap, Shield, Clock, Eye } from "lucide-react"
import { getTeamFlag } from "@/lib/team-flags"
import { cn } from "@/lib/utils"
import type { Match, Prediction, PowerUpUse } from "@/types"

export function calcScenarioPts(
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

export const POWER_UP_ICONS: Record<string, { icon: typeof Shield; color: string }> = {
  late_change: { icon: Clock, color: "text-blue-500" },
  double_points: { icon: Zap, color: "text-yellow-500" },
  spy: { icon: Eye, color: "text-purple-500" },
  wildcard: { icon: Shield, color: "text-emerald-500" },
}

function TeamFlag({ name }: { name: string }) {
  const src = getTeamFlag(name)
  if (!src) return <div className="w-5 h-3.5 rounded-sm bg-muted shrink-0" />
  return <img src={src} alt={name} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
}

export interface Member {
  user_id: string
  total_points?: number
  profiles: { full_name: string | null; nickname: string | null; avatar_url: string | null } | null
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

interface MatchDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: Match | null
  members: Member[]
  preds: Map<string, Prediction>
  powerUpsByUser: Map<string, Set<string>>
  currentRanking: { user_id: string; total_points: number }[]
  userId: string | null
  scenarioPowerUps: PowerUpUse[]
}

export function MatchDetailDialog({
  open, onOpenChange, match, members, preds, powerUpsByUser, currentRanking, userId, scenarioPowerUps,
}: MatchDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
        {match && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="flex items-center justify-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <TeamFlag name={match.home_team} />
                    <span className="font-bold text-sm">{match.home_team}</span>
                  </div>
                  <span className="font-black text-lg px-1">
                    {match.status === "finished" ? `${match.home_score} - ${match.away_score}` : "vs"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{match.away_team}</span>
                    <TeamFlag name={match.away_team} />
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            {(match.status === "live" ||
              (match.status !== "finished" && new Date() >= new Date(match.match_date))) && (
              <ScenarioCalculator
                match={match}
                members={members}
                preds={preds}
                currentRanking={currentRanking}
                userId={userId}
                allPowerUps={scenarioPowerUps}
              />
            )}

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 pb-1">Predicciones</p>
            <div className="divide-y divide-border/50">
              {members.map(member => {
                const pred = preds.get(member.user_id)
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
                        const userPus = powerUpsByUser.get(member.user_id) ?? new Set<string>()
                        const icons: React.ReactNode[] = []
                        // Show wildcard only if it actually fired (base pts = 0 but earned > 0)
                        if (userPus.has("wildcard") && pred && pred.points_earned !== null) {
                          const basePts = match?.status === "finished" && match.home_score != null && match.away_score != null
                            ? calcScenarioPts(pred.home_score, pred.away_score, match.home_score, match.away_score, match.phase)
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
  )
}
