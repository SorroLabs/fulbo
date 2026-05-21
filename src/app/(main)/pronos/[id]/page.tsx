import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Trophy, Globe, Lock, Crown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PronoInvite } from "@/components/prono/prono-invite"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function PollaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: prono }, { data: members }] = await Promise.all([
    supabase
      .from("pronos")
      .select("*, competitions(*)")
      .eq("invite_code", id.toUpperCase())
      .single(),
    supabase
      .from("prono_members")
      .select("*, profiles(*)")
      .eq("prono_id", id)
      .order("total_points", { ascending: false }),
  ])

  if (!prono) notFound()

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
        {(isMember || isOwner) && (
          <PronoInvite inviteCode={prono.invite_code} appUrl={appUrl} />
        )}
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
          <TabsTrigger value="members" className="rounded-full gap-2">
            <Users className="h-4 w-4" /> Miembros
          </TabsTrigger>
        </TabsList>

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
      </Tabs>

      <div className="flex justify-center">
        <Link href={`/competitions/${prono.competition_id}/rankings`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          <Trophy className="mr-2 h-4 w-4" /> Ver ranking global de la competición
        </Link>
      </div>
    </div>
  )
}
