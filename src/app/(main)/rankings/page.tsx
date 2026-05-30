import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp } from "lucide-react"
import { PositionEvolutionChart } from "@/components/rankings/position-evolution-chart"
import { CompetitionSelector } from "@/components/rankings/competition-selector"

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string }>
}) {
  const { comp } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, name, season, status")
    .order("start_date", { ascending: false })

  if (!competitions?.length) {
    return (
      <div className="text-center text-muted-foreground py-20">
        No hay competiciones disponibles.
      </div>
    )
  }

  // Default: first active, then most recent
  const defaultComp =
    competitions.find(c => c.status !== "finished") ?? competitions[0]
  const selectedId = comp ?? defaultComp.id
  const competition = competitions.find(c => c.id === selectedId) ?? defaultComp

  const [{ data: leaderboard }, { data: snapshots }] = await Promise.all([
    supabase.rpc("get_global_leaderboard", { p_competition_id: competition.id, p_limit: 100 }),
    supabase
      .from("leaderboard_snapshots")
      .select("*, matches(home_team, away_team, match_date, phase)")
      .eq("competition_id", competition.id)
      .is("prono_id", null)
      .order("created_at")
      .limit(64),
  ])

  const myRank = leaderboard?.find((e: any) => e.user_id === user?.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1">Rankings</h1>
        <p className="text-muted-foreground">Ranking global por competición</p>
      </div>

      {/* Competition selector */}
      <CompetitionSelector competitions={competitions} selectedId={competition.id} />

      {/* My position card */}
      {myRank && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tu posición — {competition.name}</p>
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
                return (
                  <div key={entry.user_id} className={`flex items-center gap-4 py-3 ${isMe ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""}`}>
                    <span className={`w-8 text-center font-black ${i < 3 ? "text-lg" : "text-sm text-muted-foreground"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={entry.avatar_url} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                        {entry.full_name} {isMe && "(vos)"}
                      </p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">🎯 {entry.exact_predictions}</span>
                        <span className="text-xs text-muted-foreground">✅ {entry.correct_predictions}</span>
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
