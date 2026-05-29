"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MatchesAdmin } from "@/components/admin/matches-admin"
import { SpecialPredictionsAdmin } from "@/components/admin/special-predictions-admin"
import { Trophy, Calendar, Star, Users, Globe, Lock, Crown, Archive, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Match, Competition } from "@/types"

interface Prono {
  id: string
  name: string
  is_public: boolean
  invite_code: string
  member_count: number
  owner_name: string | null
  created_at: string
}

interface Props {
  userCount: number
  competitions: Competition[]
  allMatches: Match[]
  pronosByCompetition: Record<string, Prono[]>
  specialPredictionCounts: Record<string, Record<string, number>>
}

export function AdminPanel({ userCount, competitions, allMatches, pronosByCompetition, specialPredictionCounts }: Props) {
  const active = competitions.filter(c => c.status !== "finished")
  const finished = competitions.filter(c => c.status === "finished")

  const [view, setView] = useState<"active" | "finished" | null>(active.length > 0 ? "active" : null)
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? "")

  const pronos = pronosByCompetition[selectedId] ?? []

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Usuarios */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black">{userCount}</p>
                <p className="text-xs text-muted-foreground">Usuarios registrados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activas */}
        <button
          onClick={() => setView(v => v === "active" ? null : "active")}
          className="text-left"
        >
          <Card className={cn(
            "transition-all cursor-pointer hover:border-primary/40",
            view === "active" && "border-primary/60 bg-primary/5"
          )}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  view === "active" ? "bg-primary text-primary-foreground" : "bg-primary/10"
                )}>
                  <Trophy className={cn("h-5 w-5", view === "active" ? "text-primary-foreground" : "text-primary")} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-black">{active.length}</p>
                  <p className="text-xs text-muted-foreground">Competiciones activas</p>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  view === "active" && "rotate-90"
                )} />
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Finalizadas */}
        <button
          onClick={() => setView(v => v === "finished" ? null : "finished")}
          className="text-left"
          disabled={finished.length === 0}
        >
          <Card className={cn(
            "transition-all",
            finished.length > 0 && "cursor-pointer hover:border-primary/40",
            view === "finished" && "border-primary/60 bg-primary/5"
          )}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  view === "finished" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Archive className={cn("h-5 w-5", view === "finished" ? "text-primary-foreground" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-black">{finished.length}</p>
                  <p className="text-xs text-muted-foreground">Competiciones finalizadas</p>
                </div>
                {finished.length > 0 && (
                  <ChevronRight className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    view === "finished" && "rotate-90"
                  )} />
                )}
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Active competition panel */}
      {view === "active" && (
        <div className="space-y-5">
          {/* Competition selector (only if multiple) */}
          {active.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {active.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedId(comp.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                    comp.id === selectedId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  {comp.name} · {comp.season}
                </button>
              ))}
            </div>
          )}

          {/* If only one, show its name as header */}
          {active.length === 1 && (
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black">{active[0].name}</h2>
              <span className="text-muted-foreground text-sm">{active[0].season}</span>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="matches">
            <TabsList className="rounded-full">
              <TabsTrigger value="matches" className="rounded-full gap-2">
                <Calendar className="h-4 w-4" /> Partidos
              </TabsTrigger>
              <TabsTrigger value="pronos" className="rounded-full gap-2">
                <Users className="h-4 w-4" /> Pronos
                <span className="bg-muted text-muted-foreground text-xs font-bold rounded-full px-1.5">
                  {pronos.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="specials" className="rounded-full gap-2">
                <Star className="h-4 w-4" /> Especiales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matches" className="mt-6">
              <MatchesAdmin
                competitions={active}
                allMatches={allMatches}
                defaultCompetitionId={selectedId}
              />
            </TabsContent>

            <TabsContent value="pronos" className="mt-6">
              {pronos.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No hay pronos creados para esta competición.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {pronos.map(prono => (
                    <Card key={prono.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate">{prono.name}</span>
                              {prono.is_public
                                ? <Badge variant="secondary" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Público</Badge>
                                : <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" /> Privado</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Crown className="h-3 w-3" /> {prono.owner_name ?? "—"}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {prono.member_count} miembros</span>
                              <span>Código: <span className="font-mono font-bold">{prono.invite_code}</span></span>
                            </div>
                          </div>
                          <Link
                            href={`/pronos/${prono.invite_code}`}
                            className="text-xs text-primary hover:underline shrink-0"
                            target="_blank"
                          >
                            Ver →
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="specials" className="mt-6">
              <SpecialPredictionsAdmin
                competitions={active}
                specialPredictionCounts={specialPredictionCounts}
                defaultCompetitionId={selectedId}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Finished competitions archive */}
      {view === "finished" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Archivo</p>
          {finished.map(comp => {
            const compMatches = allMatches.filter(m => m.competition_id === comp.id)
            const compPronos = pronosByCompetition[comp.id] ?? []
            return (
              <Card key={comp.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{comp.name}</p>
                        <Badge variant="outline" className="text-xs">Finalizado</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {comp.season} · {compMatches.length} partidos · {compPronos.length} pronos
                      </p>
                    </div>
                    <Link
                      href={`/competitions/${comp.id}/rankings`}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Ver rankings →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
