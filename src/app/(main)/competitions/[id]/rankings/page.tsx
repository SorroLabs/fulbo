import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Target } from "lucide-react"
import { PositionEvolutionChart } from "@/components/rankings/position-evolution-chart"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function RankingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: competition }, { data: leaderboard }, { data: snapshots }] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase.rpc("get_global_leaderboard", { p_competition_id: id, p_limit: 50 }),
    supabase
      .from("leaderboard_snapshots")
      .select("*, matches(home_team, away_team, match_date, phase)")
      .eq("competition_id", id)
      .is("prono_id", null)
      .order("created_at")
      .limit(30),
  ])

  const userIds = leaderboard?.map((e: any) => e.user_id) ?? []
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, nickname").in("id", userIds)
    : { data: [] }
  const nicknameMap = new Map(profiles?.map((p: any) => [p.id, p.nickname]) ?? [])

  if (!competition) notFound()

  const myRank = leaderboard?.find((e: any) => e.user_id === user?.id)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black mb-1">Rankings</h1>
          <p className="text-muted-foreground">{competition.name} · {competition.season}</p>
        </div>
        <Link href={`/competitions/${id}/analytics`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}>
          <Target className="h-4 w-4" /> Analytics
        </Link>
      </div>

      {myRank && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tu posición global</p>
                <p className="text-4xl font-black text-primary">#{myRank.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Tus puntos</p>
                <p className="text-4xl font-black">{myRank.total_points}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="global">
        <TabsList className="rounded-full">
          <TabsTrigger value="global" className="rounded-full gap-2">
            <Trophy className="h-4 w-4" /> Global
          </TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-full gap-2">
            <TrendingUp className="h-4 w-4" /> Evolución
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <Card>
            <CardContent className="pt-4 divide-y divide-border/50">
              {leaderboard?.map((entry: any, i: number) => {
                const isMe = entry.user_id === user?.id
                const initials = entry.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"
                const nickname = nicknameMap.get(entry.user_id)
                return (
                  <div key={entry.user_id} className={`flex items-center gap-4 py-3 ${isMe ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""}`}>
                    <span className={`w-8 text-center font-black ${i < 3 ? "text-lg" : "text-muted-foreground"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={entry.avatar_url} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold leading-tight truncate ${isMe ? "text-primary" : ""}`}>
                        {entry.full_name} {isMe && "(vos)"}
                      </p>
                      {nickname && (
                        <p className="text-xs text-muted-foreground leading-tight truncate">@{nickname}</p>
                      )}
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">✅ {entry.exact_predictions}</span>
                        <span className="text-xs text-muted-foreground">☑️ {entry.correct_predictions}</span>
                        <span className="text-xs text-muted-foreground">❌ {entry.wrong_predictions}</span>
                      </div>
                    </div>
                    <span className="font-black text-xl shrink-0">{entry.total_points}</span>
                  </div>
                )
              })}
              {!leaderboard?.length && (
                <p className="text-center text-muted-foreground py-10">
                  El ranking se actualizará cuando finalicen los primeros partidos.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolución de posiciones (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionEvolutionChart snapshots={snapshots ?? []} currentUserId={user?.id ?? null} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
