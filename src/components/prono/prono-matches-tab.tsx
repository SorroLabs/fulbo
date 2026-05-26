"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MatchCard } from "@/components/competition/match-card"
import { MatchListRow } from "@/components/competition/match-list-row"
import { Eye, EyeOff, LayoutGrid, List } from "lucide-react"
import { getTeamFlag } from "@/lib/team-flags"
import { cn } from "@/lib/utils"
import type { Match, Prediction } from "@/types"

interface Member {
  user_id: string
  profiles: { full_name: string | null; nickname: string | null; avatar_url: string | null } | null
}

interface Props {
  matches: Match[]
  members: Member[]
  predictions: Prediction[]
  userId: string | null
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

export function PronoMatchesTab({ matches, members, predictions, userId }: Props) {
  const [selected, setSelected] = useState<Match | null>(null)
  const [view, setView] = useState<"grid" | "list">("grid")

  // Map: matchId -> userId -> prediction
  const predMap = new Map<string, Map<string, Prediction>>()
  for (const p of predictions) {
    if (!predMap.has(p.match_id)) predMap.set(p.match_id, new Map())
    predMap.get(p.match_id)!.set(p.user_id, p)
  }

  // Map: matchId -> user's own prediction
  const myPredMap = new Map<string, Prediction>()
  if (userId) {
    for (const p of predictions) {
      if (p.user_id === userId) myPredMap.set(p.match_id, p)
    }
  }

  const byPhase = matches.reduce((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {} as Record<string, Match[]>)

  const selectedPreds = selected ? predMap.get(selected.id) : null

  function renderMatch(match: Match) {
    const locked = isLocked(match)
    if (!locked) {
      const eyeOff = <span title="Predicciones visibles 20 minutos antes de iniciar"><EyeOff className="h-4 w-4 text-muted-foreground/30" /></span>
      if (view === "grid") {
        return (
          <MatchCard key={match.id} match={match} prediction={myPredMap.get(match.id) ?? null} userId={userId} eyeIcon={eyeOff} />
        )
      }
      return (
        <MatchListRow key={match.id} match={match} prediction={myPredMap.get(match.id) ?? null} userId={userId} eyeIcon={eyeOff} />
      )
    }

    const matchPreds = predMap.get(match.id)
    const myPredLocked = myPredMap.get(match.id)
    const tintLocked = match.status === "finished" && myPredLocked && match.home_score != null && match.away_score != null
      ? myPredLocked.home_score === match.home_score && myPredLocked.away_score === match.away_score
        ? "#D4FFB3"
        : Math.sign(match.home_score - match.away_score) === Math.sign(myPredLocked.home_score - myPredLocked.away_score)
          ? "#FFF3B1"
          : "#FFBEB2"
      : undefined

    if (view === "list") {
      const listDateStr = new Date(match.match_date).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      return (
        <button key={match.id} onClick={() => setSelected(match)} className="w-full text-left">
          <div
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
            style={tintLocked ? { backgroundColor: tintLocked } : undefined}
          >
            <div className="hidden sm:flex flex-col items-center w-16 shrink-0">
              <span className="text-xs text-muted-foreground text-center whitespace-nowrap">{listDateStr}</span>
              {match.group_name && <span className="text-xs text-muted-foreground/60">{match.group_name}</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
              <span className="text-sm font-semibold truncate text-right">{match.home_team}</span>
              <TeamFlag name={match.home_team} />
            </div>
            <div className="shrink-0 w-20 flex items-center justify-center">
              <span className="font-black text-lg text-center">
                {match.status === "finished" ? `${match.home_score} - ${match.away_score}` : "vs"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <TeamFlag name={match.away_team} />
              <span className="text-sm font-semibold truncate">{match.away_team}</span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{matchPreds?.size ?? 0}/{members.length}</span>
              <Eye className="h-4 w-4 text-primary" />
            </div>
          </div>
        </button>
      )
    }

    // Grid locked card — same structure as MatchCard for visual consistency
    const dateStr = new Date(match.match_date).toLocaleString("es", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset",
    })
    const myPred = myPredMap.get(match.id)
    const tint = match.status === "finished" && myPred && match.home_score != null && match.away_score != null
      ? myPred.home_score === match.home_score && myPred.away_score === match.away_score
        ? "#D4FFB3"
        : Math.sign(match.home_score - match.away_score) === Math.sign(myPred.home_score - myPred.away_score)
          ? "#FFF3B1"
          : "#FFBEB2"
      : undefined
    return (
      <button key={match.id} onClick={() => setSelected(match)} className="w-full text-left cursor-pointer hover:scale-[1.01] transition-all rounded-xl">
        <Card className="border-primary/20 hover:border-primary/40 transition-colors" style={tint ? { backgroundColor: tint } : undefined}>
          <CardContent>
            {/* Header — date truncates if narrow, right side never wraps */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs text-muted-foreground min-w-0 truncate">{dateStr}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {match.group_name && <span className="text-xs text-muted-foreground">{match.group_name}</span>}
                <Badge variant={match.status === "finished" ? "outline" : "secondary"} className="text-xs">
                  {match.status === "finished" ? "Finalizado" : "Próximo"}
                </Badge>
                <Eye className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Flags + score */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 flex justify-center">
                <img src={getTeamFlag(match.home_team) ?? undefined} alt={match.home_team}
                  className="rounded shadow-sm object-cover" style={{ width: 40, height: 28, flexShrink: 0 }} />
              </div>
              <div className="w-32 shrink-0 flex items-center justify-center" style={{ height: 48 }}>
                <div className="flex items-center gap-1.5 font-black text-2xl">
                  {match.status === "finished" ? (
                    <>
                      <span>{match.home_score}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{match.away_score}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-lg font-bold">vs</span>
                  )}
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <img src={getTeamFlag(match.away_team) ?? undefined} alt={match.away_team}
                  className="rounded shadow-sm object-cover" style={{ width: 40, height: 28, flexShrink: 0 }} />
              </div>
            </div>
            {/* Names — flex items-center centers text vertically within minHeight */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center justify-center text-sm font-semibold text-center leading-tight" style={{ minHeight: "2.5em" }}>{match.home_team}</div>
              <div className="w-32 shrink-0" />
              <div className="flex-1 flex items-center justify-center text-sm font-semibold text-center leading-tight" style={{ minHeight: "2.5em" }}>{match.away_team}</div>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-center" style={{ minHeight: 36 }}>
              <span className="text-xs text-primary/70">
                {matchPreds?.size ?? 0} de {members.length} predicciones · tap para ver
              </span>
            </div>
          </CardContent>
        </Card>
      </button>
    )
  }

  return (
    <>
      <div className="space-y-8">
        {/* View toggle */}
        <div className="flex justify-end">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={cn("p-2 transition-colors", view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("p-2 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {PHASE_ORDER.filter(p => byPhase[p]?.length).map(phase => (
          <div key={phase}>
            <h3 className="font-bold text-lg mb-4">
              <Badge variant="outline" className="text-primary border-primary/30">{PHASE_LABELS[phase]}</Badge>
            </h3>
            {view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {byPhase[phase].map(match => renderMatch(match))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {byPhase[phase].map(match => renderMatch(match))}
              </div>
            )}
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
                      {selected.status === "finished"
                        ? `${selected.home_score} - ${selected.away_score}`
                        : "vs"}
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
                      <span className="flex-1 text-sm font-medium truncate">
                        {displayName}{isMe && " (vos)"}
                      </span>
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
