import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Calendar, Star } from "lucide-react"
import { MatchesView } from "@/components/competition/matches-view"
import type { Match } from "@/types"

const SPECIAL_LABELS: Record<string, { label: string; emoji: string }> = {
  champion:    { label: "Campeón del torneo",         emoji: "🏆" },
  top_scorer:  { label: "Goleador del torneo",         emoji: "⚽" },
  golden_ball: { label: "Balón de Oro (mejor jugador)", emoji: "🌟" },
}

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: competition }, { data: matches }] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase.from("matches").select("*").eq("competition_id", id)
      .not("home_team", "like", "Ganador%")
      .order("match_date"),
  ])

  if (!competition) notFound()

  const matchList = (matches as Match[]) ?? []
  const totalMatches = matchList.length
  const finishedMatches = matchList.filter(m => m.status === "finished").length
  const liveMatches = matchList.filter(m => m.status === "live").length

  const officialAnswers = competition.official_answers ?? {}
  const hasOfficialAnswers = Object.keys(officialAnswers).length > 0

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
          <Link href={`/rankings?comp=${id}`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}>
            <Trophy className="h-4 w-4" /> Rankings
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-black text-primary">{finishedMatches}</p>
            <p className="text-xs text-muted-foreground">Partidos jugados</p>
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
            <p className={`text-2xl font-black ${liveMatches > 0 ? "text-green-500" : ""}`}>
              {liveMatches > 0 ? liveMatches : totalMatches - finishedMatches}
            </p>
            <p className="text-xs text-muted-foreground">
              {liveMatches > 0 ? "En juego ahora" : "Por jugarse"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matches">
        <TabsList className="rounded-full">
          <TabsTrigger value="matches" className="rounded-full gap-2">
            <Calendar className="h-4 w-4" /> Partidos
          </TabsTrigger>
          {hasOfficialAnswers && (
            <TabsTrigger value="specials" className="rounded-full gap-2">
              <Star className="h-4 w-4" /> Resultados especiales
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="matches" className="mt-6">
          <MatchesView
            matches={matchList}
            predMap={new Map()}
            userId={null}
            showUpcoming={false}
          />
        </TabsContent>

        {hasOfficialAnswers && (
          <TabsContent value="specials" className="mt-6">
            <div className="space-y-3">
              {Object.entries(officialAnswers as Record<string, string>).map(([type, value]) => {
                const cfg = SPECIAL_LABELS[type]
                if (!cfg) return null
                return (
                  <Card key={type}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cfg.emoji}</span>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">{cfg.label}</p>
                          <p className="text-lg font-black">{value}</p>
                        </div>
                        <Badge variant="outline" className="ml-auto text-primary border-primary/30">Oficial</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
