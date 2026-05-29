"use client"

import { useState, useTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MatchesAdmin } from "@/components/admin/matches-admin"
import { SpecialPredictionsAdmin } from "@/components/admin/special-predictions-admin"
import { Trophy, Calendar, Star, Users, Globe, Lock, Crown, Archive, ChevronRight, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { setUserRole } from "@/app/actions/admin"
import { toast } from "sonner"
import Link from "next/link"
import type { Match, Competition } from "@/types"

function UserRow({ user }: { user: { id: string; full_name: string | null; nickname: string | null; avatar_url: string | null; role: string | null; created_at: string } }) {
  const [isPending, startTransition] = useTransition()
  const isAdmin = user.role === "admin"
  const initials = (user.full_name ?? user.nickname ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

  function toggleRole() {
    startTransition(async () => {
      const res = await setUserRole({ targetUserId: user.id, role: isAdmin ? "user" : "admin" })
      if (res.error) toast.error(res.error)
      else toast.success(isAdmin ? "Rol removido" : "Promovido a admin")
    })
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{user.full_name ?? "—"}</span>
              {user.nickname && <span className="text-xs text-muted-foreground">@{user.nickname}</span>}
              {isAdmin && (
                <Badge variant="default" className="gap-1 text-xs h-5">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Se unió {new Date(user.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <Button
            size="sm"
            variant={isAdmin ? "outline" : "secondary"}
            onClick={toggleRole}
            disabled={isPending}
            className="rounded-full h-7 text-xs shrink-0"
          >
            {isPending ? "..." : isAdmin ? "Quitar admin" : "Hacer admin"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
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

interface User {
  id: string
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
  role: string | null
  created_at: string
}

interface Props {
  userCount: number
  users: User[]
  competitions: Competition[]
  allMatches: Match[]
  pronosByCompetition: Record<string, Prono[]>
  specialPredictionCounts: Record<string, Record<string, number>>
}

export function AdminPanel({ userCount, users, competitions, allMatches, pronosByCompetition, specialPredictionCounts }: Props) {
  const active = competitions.filter(c => c.status !== "finished")
  const finished = competitions.filter(c => c.status === "finished")

  const [view, setView] = useState<"users" | "active" | "finished" | null>(null)
  const [selectedId, setSelectedId] = useState<string>("")

  const selectedComp = active.find(c => c.id === selectedId)
  const pronos = pronosByCompetition[selectedId] ?? []

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Usuarios */}
        <button onClick={() => setView(v => v === "users" ? null : "users")} className="text-left">
          <Card className={cn(
            "transition-all cursor-pointer hover:border-primary/40",
            view === "users" && "border-primary/60 bg-primary/5"
          )}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  view === "users" ? "bg-primary text-primary-foreground" : "bg-primary/10"
                )}>
                  <Users className={cn("h-5 w-5", view === "users" ? "text-primary-foreground" : "text-primary")} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-black">{userCount}</p>
                  <p className="text-xs text-muted-foreground">Usuarios registrados</p>
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", view === "users" && "rotate-90")} />
              </div>
            </CardContent>
          </Card>
        </button>

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

      {/* Users panel */}
      {view === "users" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Usuarios registrados</p>
          <div className="space-y-2">
            {users.map(u => (
              <UserRow key={u.id} user={u} />
            ))}
          </div>
        </div>
      )}

      {/* Active competition panel */}
      {view === "active" && (
        <div className="space-y-5">
          {/* Dropdown selector — always shown, always required */}
          <div className="max-w-sm">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-2">
              Seleccioná una competición
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="" disabled>Elegir competición...</option>
              {active.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} · {comp.season}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs — only shown once a competition is selected */}
          {selectedComp && (
            <>
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-black">{selectedComp.name}</span>
                <span className="text-muted-foreground text-sm">{selectedComp.season}</span>
              </div>

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
            </>
          )}
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
