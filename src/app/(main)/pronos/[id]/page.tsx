import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Globe, Lock, Crown, Calendar, BarChart3, Coins, UserPlus, Star, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PronoInvite } from "@/components/prono/prono-invite"
import { PronoVisibilityToggle } from "@/components/prono/prono-visibility-toggle"
import { PronoMatchesTab } from "@/components/prono/prono-matches-tab"
import { PronoCoinsTab } from "@/components/prono/prono-coins-tab"
import { PronoAdminSheet } from "@/components/prono/prono-admin-sheet"
import { PronoJoinButton } from "@/components/prono/prono-join-button"
import { SpecialPredictionsForm } from "@/components/competition/special-predictions-form"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Match } from "@/types"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: prono } = await supabase
    .from("pronos")
    .select("name, description, competitions(name, season), prono_members(count)")
    .eq("invite_code", id.toUpperCase())
    .single()

  if (!prono) return { title: "fulbo.io" }

  const memberCount = (prono.prono_members as any)?.[0]?.count ?? 0
  const competition = (prono.competitions as any)
  const title = `${prono.name} — fulbo.io`
  const description = prono.description
    ? `${prono.description} · ${memberCount} participante${memberCount !== 1 ? "s" : ""} · ${competition?.name ?? ""} ${competition?.season ?? ""}`
    : `¡Unite a "${prono.name}"! Ya somos ${memberCount} participante${memberCount !== 1 ? "s" : ""} prediciendo el ${competition?.name ?? "Mundial 2026"}.`

  const BASE_URL = "https://fulbo.io"
  const url = `${BASE_URL}/pronos/${id.toUpperCase()}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "fulbo.io",
      type: "website",
      locale: "es_419",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default async function PollaDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { id } = await params
  const { ref: referrerId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: prono } = await supabase
    .from("pronos")
    .select("*, competitions(*)")
    .eq("invite_code", id.toUpperCase())
    .single()

  const { data: members } = prono
    ? await supabase
        .from("prono_members")
        .select("*, profiles(*)")
        .eq("prono_id", prono.id)
        .order("total_points", { ascending: false })
    : { data: null }

  if (!prono) notFound()

  const memberIds = (members ?? []).map((m: any) => m.user_id)

  const [{ data: matches }, { data: allPredictions }, { data: myPowerUps }, { data: allPowerUps }, { data: myMembership }, { data: myTransactions }, { data: mySpecials }, { data: lastSnapshot }] = await Promise.all([
    supabase.from("matches").select("*").eq("competition_id", prono.competition_id)
      .not("home_team", "like", "Ganador%")
      .order("match_date"),
    memberIds.length > 0
      ? supabase.from("predictions").select("*")
          .eq("prono_id", prono.id)
          .in("user_id", memberIds)
      : { data: [] },
    user
      ? supabase.from("power_up_uses").select("*").eq("prono_id", prono.id).eq("user_id", user.id)
      : { data: [] },
    supabase.from("power_up_uses").select("user_id, match_id, type").eq("prono_id", prono.id),
    user
      ? supabase.from("prono_members").select("coins_in_prono").eq("prono_id", prono.id).eq("user_id", user.id).single()
      : { data: null },
    user
      ? supabase.from("coin_transactions").select("*").eq("prono_id", prono.id).eq("user_id", user.id).order("created_at", { ascending: false })
      : { data: [] },
    user
      ? supabase.from("special_predictions").select("*").eq("user_id", user.id).eq("competition_id", prono.competition_id)
      : { data: [] },
    supabase.from("leaderboard_snapshots")
      .select("snapshot_data")
      .eq("prono_id", prono.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Calculate total_points on-the-fly from predictions so the leaderboard
  // is always consistent with actual scored predictions, never stale from DB.
  const pointsByUser = new Map<string, number>()
  for (const p of (allPredictions ?? []) as any[]) {
    if (p.points_earned != null) {
      pointsByUser.set(p.user_id, (pointsByUser.get(p.user_id) ?? 0) + p.points_earned)
    }
  }
  const membersWithLivePoints = (members ?? [])
    .filter((m: any) => m.is_active !== false)
    .map((m: any) => ({ ...m, total_points: pointsByUser.get(m.user_id) ?? 0 }))
    .sort((a: any, b: any) => b.total_points - a.total_points)

  // Previous rank map from last snapshot
  const prevRankMap = new Map<string, number>(
    ((lastSnapshot as any)?.snapshot_data ?? []).map((e: any) => [e.user_id, e.rank])
  )

  const allMembersForAdmin = (members ?? [])
    .map((m: any) => ({ user_id: m.user_id, is_active: m.is_active !== false, role: m.role ?? "member", profiles: m.profiles }))

  const isMember = members?.some((m: any) => m.user_id === user?.id)
  const isOwner = prono.owner_id === user?.id
  const isCoAdmin = !isOwner && members?.some((m: any) => m.user_id === user?.id && m.role === "admin")
  const canManage = isOwner || isCoAdmin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const competition = (prono as any).competitions
  const teams = Array.from(new Set(
    (matches as Match[] | null)
      ?.filter(m => m.phase === "groups")
      .flatMap(m => [m.home_team, m.away_team]) ?? []
  )).sort((a, b) => a.localeCompare(b, "es"))

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-black">{prono.name}</h1>
            {isOwner
              ? <PronoVisibilityToggle pronoId={prono.id} isPublic={prono.is_public} />
              : prono.is_public
                ? <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" /> Público</Badge>
                : <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Privado</Badge>}
          </div>
          <p className="text-muted-foreground">{(prono as any).competitions?.name} · {(prono as any).competitions?.season}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Link href={`/competitions/${prono.competition_id}/rankings`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}>
            <BarChart3 className="h-4 w-4" /> Estadísticas
          </Link>
          {!isMember && !isOwner && (
            <PronoJoinButton pronoId={prono.id} inviteCode={prono.invite_code} isLoggedIn={!!user} referrerId={referrerId} />
          )}
          {(isMember || isOwner) && (
            <PronoInvite inviteCode={prono.invite_code} appUrl={appUrl} userId={user?.id} />
          )}
          {canManage && (
            <PronoAdminSheet
              pronoId={prono.id}
              inviteCode={prono.invite_code}
              initialName={prono.name}
              initialDescription={prono.description ?? ""}
              initialMaxMembers={prono.max_members}
              members={allMembersForAdmin}
              ownerId={prono.owner_id}
              currentUserId={user!.id}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black text-primary">{membersWithLivePoints.length}</p>
            <p className="text-xs text-muted-foreground">Participantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black">{prono.max_members}</p>
            <p className="text-xs text-muted-foreground">Máximo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black text-primary">
              {membersWithLivePoints.find((m: any) => m.user_id === user?.id)?.total_points ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Tus puntos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList className="rounded-full">
          <TabsTrigger value="ranking" className="rounded-full gap-2">
            <Trophy className="h-4 w-4" /> Tabla
          </TabsTrigger>
          <TabsTrigger value="matches" className="rounded-full gap-2">
            <Calendar className="h-4 w-4" /> Partidos
          </TabsTrigger>
          <TabsTrigger value="specials" className="rounded-full gap-2">
            <Star className="h-4 w-4" /> Especiales
          </TabsTrigger>
          {isMember && (
            <TabsTrigger value="coins" className="rounded-full gap-2">
              <Coins className="h-4 w-4" /> Monedas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="matches" className="mt-6 data-[hidden]:hidden" keepMounted>
          <PronoMatchesTab
            matches={(matches as Match[]) ?? []}
            members={membersWithLivePoints.map((m: any) => ({ user_id: m.user_id, profiles: m.profiles }))}
            predictions={allPredictions ?? []}
            userId={user?.id ?? null}
            pronoId={prono.id}
            powerUpsEnabled={prono.power_ups_enabled ?? true}
            coinsInProno={(myMembership as any)?.coins_in_prono ?? 0}
            myPowerUps={(myPowerUps as any) ?? []}
            allPowerUps={(allPowerUps as any) ?? []}
          />
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <Card>
            {/* Column headers */}
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
              {(() => {
                const finishedMatches = (matches ?? []).filter((m: any) => m.status === "finished")
                const doublePointsSet = new Set(
                  ((allPowerUps ?? []) as any[])
                    .filter((pu: any) => pu.type === "double_points")
                    .map((pu: any) => `${pu.user_id}:${pu.match_id}`)
                )
                return membersWithLivePoints.map((member: any, i: number) => {
                const isMe = member.user_id === user?.id
                const initials = member.profiles?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"

                const memberPreds = (allPredictions ?? []).filter((p: any) => p.user_id === member.user_id)
                const predByMatch = new Map(memberPreds.map((p: any) => [p.match_id, p]))

                let exactos = 0
                let jugados = 0
                let maxPts = 0

                for (const m of finishedMatches) {
                  const pred = predByMatch.get(m.id)
                  if (!pred) continue
                  jugados++
                  const base = m.phase === "groups" ? 10 : 20
                  const hasDouble = doublePointsSet.has(`${member.user_id}:${m.id}`)
                  maxPts += hasDouble ? base * 2 : base
                  if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
                    exactos++
                  }
                }

                const efectividad = maxPts > 0 ? Math.round((member.total_points / maxPts) * 100) : null
                const currentRank = i + 1
                const prevRank = prevRankMap.get(member.user_id)
                const rankDelta = prevRank != null ? prevRank - currentRank : null

                return (
                  <div key={member.id} className={`flex items-center gap-3 py-3 ${isMe ? "text-primary" : ""}`}>
                    <div className="w-6 shrink-0 flex flex-col items-center">
                      <span className={`font-black text-base ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : currentRank}
                      </span>
                      {rankDelta !== null && rankDelta !== 0 && (
                        <span className={`flex items-center text-[10px] font-bold leading-none ${rankDelta > 0 ? "text-emerald-500" : "text-red-500"}`}>
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
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold leading-tight truncate text-sm ${isMe ? "text-primary" : ""}`}>
                        {member.profiles?.full_name ?? "Usuario"} {isMe && <span className="font-normal opacity-60">(tú)</span>}
                        {member.user_id === prono.owner_id && (
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
                    {/* Desktop stats */}
                    <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
                      <span className="font-black text-base w-12">{member.total_points}</span>
                      <span className="font-bold text-sm w-12 text-primary">{exactos}</span>
                      <span className="font-bold text-sm w-12 text-muted-foreground">
                        {efectividad !== null ? `${efectividad}%` : "—"}
                      </span>
                    </div>
                    {/* Mobile: only points */}
                    <span className="sm:hidden font-black text-base shrink-0 w-10 text-right">{member.total_points}</span>
                  </div>
                )
              })
              })()}
              {!membersWithLivePoints.length && (
                <p className="text-center text-muted-foreground py-8">Nadie ha sumado puntos aún.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specials" className="mt-6">
          <SpecialPredictionsForm
            competitionId={prono.competition_id}
            isLocked={(matches as Match[] | null)?.some(m => m.status === "live" || m.status === "finished") ?? false}
            userId={user?.id ?? null}
            existing={mySpecials ?? []}
            teams={teams}
          />
        </TabsContent>

        <TabsContent value="members-removed" className="mt-6">
          <Card>
            <CardContent className="pt-4 divide-y divide-border/50">
              {membersWithLivePoints.map((member: any) => {
                const initials = member.profiles?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"
                return (
                  <div key={member.id} className="flex items-center gap-3 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.profiles?.full_name ?? "Usuario"}</p>
                      <p className="text-xs text-muted-foreground">
                        Se unió {new Date(member.joined_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {member.user_id === prono.owner_id && (
                      <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                        <Crown className="h-3 w-3" /> Admin
                      </Badge>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
        {isMember && (
          <TabsContent value="coins" className="mt-6">
            <PronoCoinsTab
              coinsInProno={(myMembership as any)?.coins_in_prono ?? 0}
              transactions={(myTransactions as any) ?? []}
              powerUpUses={(myPowerUps as any) ?? []}
            />
          </TabsContent>
        )}
      </Tabs>

    </div>
  )
}
