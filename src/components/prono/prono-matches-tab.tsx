"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, EyeOff } from "lucide-react"
import { getTeamFlag } from "@/lib/team-flags"
import { cn } from "@/lib/utils"
import type { Match } from "@/types"

interface Member {
  user_id: string
  profiles: { full_name: string | null; nickname: string | null; avatar_url: string | null } | null
}

interface Prediction {
  user_id: string
  match_id: string
  home_score: number
  away_score: number
  points_earned: number | null
}

interface Props {
  matches: Match[]
  members: Member[]
  predictions: Prediction[]
}

const PHASE_LABELS: Record<string, string> = {
  groups: "Fase de grupos",
  round_of_32: "Ronda de 32",
  round_of_16: "Octavos de final",
  quarterfinals: "Cuartos de final",
  semifinals: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
}
const PHASE_ORDER = ["groups", "round_of_32", "round_of_16", "quarterfinals", "semifinals", "third_place", "final"]

function isLocked(match: Match) {
  if (match.status !== "upcoming") return true
  const deadline = new Date(match.match_date)
  deadline.setMinutes(deadline.getMinutes() - 20)
  return new Date() > deadline
}

function TeamFlag({ name }: { name: string }) {
  const src = getTeamFlag(name)
  if (!src) return <div className="w-5 h-3.5 rounded-sm bg-muted shrink-0" />
  return <img src={src} alt={name} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
}

function MemberInitials(profile: Member["profiles"]) {
  return (profile?.full_name ?? profile?.nickname ?? "?")
    .split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
}

export function PronoMatchesTab({ matches, members, predictions }: Props) {
  const [selected, setSelected] = useState<Match | null>(null)

  const predMap = new Map<string, Map<string, Prediction>>()
  for (const p of predictions) {
    if (!predMap.has(p.match_id)) predMap.set(p.match_id, new Map())
    predMap.get(p.match_id)!.set(p.user_id, p)
  }

  const byPhase = matches.reduce((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {} as Record<string, Match[]>)

  const selectedPreds = selected ? predMap.get(selected.id) : null

  return (
    <>
      <div className="space-y-8">
        {PHASE_ORDER.filter(p => byPhase[p]?.length).map(phase => (
          <div key={phase}>
            <h3 className="font-bold text-lg mb-4">
              <Badge variant="outline" className="text-primary border-primary/30">{PHASE_LABELS[phase]}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {byPhase[phase].map(match => {
                const locked = isLocked(match)
                return (
                  <button
                    key={match.id}
                    disabled={!locked}
                    onClick={() => locked && setSelected(match)}
                    className={cn(
                      "w-full text-left transition-all rounded-xl",
                      locked ? "cursor-pointer hover:scale-[1.01]" : "cursor-default opacity-60"
                    )}
                  >
                    <Card className={cn(locked && "border-primary/20 hover:border-primary/40 transition-colors")}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(match.match_date).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <div className="flex items-center gap-2">
                            {match.group_name && <span className="text-xs text-muted-foreground">{match.group_name}</span>}
                            {locked
                              ? <Eye className="h-4 w-4 text-primary" />
                              : <EyeOff className="h-4 w-4 text-muted-foreground" />
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2">
                            <TeamFlag name={match.home_team} />
                            <span className="text-sm font-semibold truncate">{match.home_team}</span>
                          </div>
                          <div className="shrink-0 font-black text-lg px-2">
                            {match.status === "finished"
                              ? `${match.home_score} - ${match.away_score}`
                              : "vs"
                            }
                          </div>
                          <div className="flex-1 flex items-center gap-2 justify-end">
                            <span className="text-sm font-semibold truncate text-right">{match.away_team}</span>
                            <TeamFlag name={match.away_team} />
                          </div>
                        </div>
                        {locked && (
                          <p className="text-xs text-primary/70 text-center mt-2">
                            {predMap.get(match.id)?.size ?? 0} de {members.length} predicciones
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <TeamFlag name={selected.home_team} />
                      <span className="font-bold text-sm">{selected.home_team}</span>
                    </div>
                    <span className="font-black text-lg px-1">
                      {selected.status === "finished" ? `${selected.home_score} - ${selected.away_score}` : "vs"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{selected.away_team}</span>
                      <TeamFlag name={selected.away_team} />
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="divide-y divide-border/50">
                {members.map(member => {
                  const pred = selectedPreds?.get(member.user_id)
                  const initials = MemberInitials(member.profiles)
                  const displayName = member.profiles?.nickname
                    ? `@${member.profiles.nickname}`
                    : (member.profiles?.full_name ?? "Usuario")
                  return (
                    <div key={member.user_id} className="flex items-center gap-3 py-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium truncate">{displayName}</span>
                      {pred ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-base">
                            {pred.home_score} - {pred.away_score}
                          </span>
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
    </>
  )
}
