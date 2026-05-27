import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Trophy, Globe, Lock, Crown, Calendar, BarChart3, Coins } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PronoInvite } from "@/components/prono/prono-invite"
import { PronoVisibilityToggle } from "@/components/prono/prono-visibility-toggle"
import { PronoMatchesTab } from "@/components/prono/prono-matches-tab"
import { PronoCoinsTab } from "@/components/prono/prono-coins-tab"
import { PronoAdminSheet } from "@/components/prono/prono-admin-sheet"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Match } from "@/types"

export default async function PollaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const [{ data: matches }, { data: allPredictions }, { data: myPowerUps }, { data: myMembership }, { data: myTransactions }] = await Promise.all([
    supabase.from("matches").select("*").eq("competition_id", prono.competition_id)
      .not("home_team", "like", "Ganador%")
      .order("match_date"),
    memberIds.length > 0
      ? supabase.from("predictions").select("*")
          .eq("competition_id", prono.competition_id)
          .in("user_id", memberIds)
      : { data: [] },
    user
      ? supabase.from("power_up_uses").select("*").eq("prono_id", prono.id).eq("user_id", user.id)
      : { data: [] },
    user
      ? supabase.from("prono_members").select("coins_in_prono").eq("prono_id", prono.id).eq("user_id", user.id).single()
      : { data: null },
    user
      ? supabase.from("coin_transactions").select("*").eq("prono_id", prono.id).eq("user_id", user.id).order("created_at", { ascending: false })
      : { data: [] },
  ])

  const isMember = members?.some((m: any) => m.user_id === user?.id)
  const isOwner = prono.owner_id === user?.id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-black">{prono.name}</h1>
            {prono.is_public
              ? <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" /> Pública</Badge>
              : <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Privada</Badge>}
          </div>
          <p className="text-muted-foreground">{(prono as any).competitions?.name} · {(prono as any).competitions?.season}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {isOwner && (
            <PronoVisibilityToggle pronoId={prono.id} isPublic={prono.is_public} />
          )}
          <Link href={`/competitions/${prono.competition_id}/rankings`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}>
            <BarChart3 className="h-4 w-4" /> Estadísticas
          </Link>
          {(isMember || isOwner) && (
            <PronoInvite inviteCode={prono.invite_code} appUrl={appUrl} />
          )}
          {isOwner && (
            <PronoAdminSheet
              pronoId={prono.id}
              inviteCode={prono.invite_code}
              initialName={prono.name}
              initialDescription={prono.description ?? ""}
              initialMaxMembers={prono.max_members}
              members={(members ?? []).map((m: any) => ({ user_id: m.user_id, profiles: m.profiles }))}
              ownerId={user!.id}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black text-primary">{members?.length ?? 0}</p>
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
              {members?.find((m: any) => m.user_id === user?.id)?.total_points ?? 0}
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
          <TabsTrigger value="members" className="rounded-full gap-2">
            <Users className="h-4 w-4" /> Miembros
          </TabsTrigger>
          {isMember && (
            <TabsTrigger value="coins" className="rounded-full gap-2">
              <Coins className="h-4 w-4" /> Monedas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="matches" className="mt-6">
          <PronoMatchesTab
            matches={(matches as Match[]) ?? []}
            members={(members ?? []).map((m: any) => ({ user_id: m.user_id, profiles: m.profiles }))}
            predictions={allPredictions ?? []}
            userId={user?.id ?? null}
            pronoId={prono.id}
            powerUpsEnabled={prono.power_ups_enabled ?? true}
            coinsInProno={(myMembership as any)?.coins_in_prono ?? 0}
            myPowerUps={(myPowerUps as any) ?? []}
          />
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <Card>
            <CardContent className="pt-4 divide-y divide-border/50">
              {members?.map((member: any, i: number) => {
                const isMe = member.user_id === user?.id
                const initials = member.profiles?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"
                return (
                  <div key={member.id} className={`flex items-center gap-4 py-3 ${isMe ? "text-primary" : ""}`}>
                    <span className={`w-8 text-center font-black text-lg ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                        {member.profiles?.full_name ?? "Usuario"} {isMe && "(vos)"}
                      </p>
                    </div>
                    {member.user_id === prono.owner_id && (
                      <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <span className="font-black text-lg shrink-0">{member.total_points}</span>
                  </div>
                )
              })}
              {!members?.length && (
                <p className="text-center text-muted-foreground py-8">Nadie ha sumado puntos aún.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardContent className="pt-4 divide-y divide-border/50">
              {members?.map((member: any) => {
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
