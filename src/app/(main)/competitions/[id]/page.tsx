import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Calendar, Target, BarChart3, Users, Star } from "lucide-react"
import { MatchesView } from "@/components/competition/matches-view"
import { SpecialPredictionsForm } from "@/components/competition/special-predictions-form"
import type { Match, Prediction } from "@/types"

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: competition }, { data: matches }, { data: userPredictions }, { data: specialPreds }] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase.from("matches").select("*").eq("competition_id", id)
      .not("home_team", "like", "Ganador%")
      .order("match_date"),
    user ? supabase.from("predictions").select("*").eq("user_id", user.id).eq("competition_id", id) : { data: [] },
    user ? supabase.from("special_predictions").select("*").eq("user_id", user.id).eq("competition_id", id) : { data: [] },
  ])

  if (!competition) notFound()

  const teams = Array.from(new Set(
    (matches as Match[] | null)
      ?.filter(m => m.phase === "groups")
      .flatMap(m => [m.home_team, m.away_team]) ?? []
  )).sort((a, b) => a.localeCompare(b, "es"))

  const predMap = new Map((userPredictions ?? []).map((p: any) => [p.match_id, p] as [string, Prediction]))

  const totalMatches = matches?.length ?? 0
  const predictedCount = userPredictions?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {competition.logo_url ? (
            <img src={competition.logo_url} alt={competition.name} className="w-16 h-16 object-contain" />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black">{competition.name}</h1>
            <p className="text-muted-foreground">{competition.season}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/competitions/${id}/rankings`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}>
            <BarChart3 className="h-4 w-4" /> Rankings
          </Link>
          <Link href={`/competitions/${id}/analytics`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}>
            <Target className="h-4 w-4" /> Analytics
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black text-primary">{predictedCount}</p>
            <p className="text-xs text-muted-foreground">Predicciones cargadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black">{totalMatches}</p>
            <p className="text-xs text-muted-foreground">Partidos totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black text-primary">
              {totalMatches > 0 ? Math.round((predictedCount / totalMatches) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Completado</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matches">
        <TabsList className="rounded-full">
          <TabsTrigger value="matches" className="rounded-full gap-2">
            <Calendar className="h-4 w-4" /> Partidos
          </TabsTrigger>
          <TabsTrigger value="specials" className="rounded-full gap-2">
            <Star className="h-4 w-4" /> Predicciones especiales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-6">
          <MatchesView
            matches={(matches as Match[]) ?? []}
            predMap={predMap}
            userId={user?.id ?? null}
          />
        </TabsContent>

        <TabsContent value="specials" className="mt-6">
          <SpecialPredictionsForm
            competitionId={id}
            competitionStatus={competition.status}
            userId={user?.id ?? null}
            existing={specialPreds ?? []}
            teams={teams}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
