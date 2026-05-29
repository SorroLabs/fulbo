"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MatchesAdmin } from "@/components/admin/matches-admin"
import { SpecialPredictionsAdmin } from "@/components/admin/special-predictions-admin"
import { Trophy, Calendar, Star, Users, Globe, Lock, Crown } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { Match, Competition } from "@/types"

const STATUS_CONFIG = {
  upcoming: { label: "Próximamente", next: "active" as const, nextLabel: "Iniciar torneo", variant: "secondary" as const },
  active:   { label: "En curso",      next: "finished" as const, nextLabel: "Finalizar torneo", variant: "default" as const },
  finished: { label: "Finalizado",    next: null, nextLabel: null, variant: "outline" as const },
}

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
  competitions: Competition[]
  allMatches: Match[]
  pronosByCompetition: Record<string, Prono[]>
  specialPredictionCounts: Record<string, Record<string, number>>
}

export function AdminPanel({ competitions, allMatches, pronosByCompetition, specialPredictionCounts }: Props) {
  const [selectedId, setSelectedId] = useState(competitions[0]?.id ?? "")

  const competition = competitions.find(c => c.id === selectedId)
  const status = competition?.status ?? "upcoming"
  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  const pronos = pronosByCompetition[selectedId] ?? []

  if (!competitions.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay competiciones. Creá una desde el SQL Editor de Supabase.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Competition selector */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Competición activa</p>
        <div className="flex flex-wrap gap-2">
          {competitions.map(comp => {
            const s = comp.status
            const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]
            return (
              <button
                key={comp.id}
                onClick={() => setSelectedId(comp.id)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                  comp.id === selectedId
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                )}
              >
                <Trophy className={cn("h-4 w-4", comp.id === selectedId ? "text-primary-foreground" : "text-primary")} />
                <span>{comp.name}</span>
                <span className={cn("text-xs font-normal", comp.id === selectedId ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {comp.season}
                </span>
                <Badge variant={cfg?.variant} className="text-xs h-5 ml-1">{cfg?.label}</Badge>
              </button>
            )
          })}
        </div>

      </div>

      {/* Tabs */}
      <Tabs defaultValue="matches">
        <TabsList className="rounded-full">
          <TabsTrigger value="matches" className="rounded-full gap-2">
            <Calendar className="h-4 w-4" /> Partidos
          </TabsTrigger>
          <TabsTrigger value="pronos" className="rounded-full gap-2">
            <Users className="h-4 w-4" /> Pronos
            <span className="bg-muted text-muted-foreground text-xs font-bold rounded-full px-1.5">{pronos.length}</span>
          </TabsTrigger>
          <TabsTrigger value="specials" className="rounded-full gap-2">
            <Star className="h-4 w-4" /> Especiales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-6">
          <MatchesAdmin
            competitions={competitions}
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
            competitions={competitions}
            specialPredictionCounts={specialPredictionCounts}
            defaultCompetitionId={selectedId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
