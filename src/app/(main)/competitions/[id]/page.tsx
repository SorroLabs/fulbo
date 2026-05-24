import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Calendar, Target, BarChart3, Users, Star } from "lucide-react"
import { MatchCard } from "@/components/competition/match-card"
import { SpecialPredictionsForm } from "@/components/competition/special-predictions-form"
import type { Match } from "@/types"

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
    (matches as Match[] | null)?.flatMap(m => [m.home_team, m.away_team]) ?? []
  )).sort((a, b) => a.localeCompare(b, "es"))

  const matchesByPhase = (matches as Match[] | null)?.reduce((acc, m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {} as Record<string, Match[]>)

  const predMap = new Map((userPredictions ?? []).map((p: any) => [p.match_id, p]))

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

        <TabsContent value="matches" className="mt-6 space-y-8">
          {PHASE_ORDER.filter(p => matchesByPhase?.[p]?.length).map(phase => (
            <div key={phase}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Badge variant="outline" className="text-primary border-primary/30">{PHASE_LABELS[phase]}</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchesByPhase![phase].map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predMap.get(match.id) ?? null}
                    userId={user?.id ?? null}
                  />
                ))}
              </div>
            </div>
          ))}
          {!totalMatches && (
            <p className="text-center text-muted-foreground py-10">Los partidos se cargarán próximamente.</p>
          )}
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
