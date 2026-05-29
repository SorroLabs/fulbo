import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShieldCheck, Users, Trophy, Star } from "lucide-react"
import { ParticipantsAdmin } from "@/components/admin/participants-admin"
import { CompetitionsAdmin } from "@/components/admin/competitions-admin"
import { MatchesAdmin } from "@/components/admin/matches-admin"
import { SpecialPredictionsAdmin } from "@/components/admin/special-predictions-admin"
import type { Match } from "@/types"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const [{ data: pendingParticipants }, { data: competitions }, { data: stats }, { data: matches }, { data: specialPredCounts }] = await Promise.all([
    supabase
      .from("competition_participants")
      .select("*, profiles(*), competitions(name)")
      .eq("status", "pending")
      .order("created_at"),
    supabase.from("competitions").select("*").order("start_date", { ascending: false }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*").order("match_date"),
    supabase.from("special_predictions").select("competition_id, type"),
  ])

  // Build counts map: { competitionId: { type: count } }
  const specialPredictionCounts: Record<string, Record<string, number>> = {}
  for (const row of specialPredCounts ?? []) {
    if (!specialPredictionCounts[row.competition_id]) specialPredictionCounts[row.competition_id] = {}
    specialPredictionCounts[row.competition_id][row.type] = (specialPredictionCounts[row.competition_id][row.type] ?? 0) + 1
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-black">Panel de administración</h1>
          <p className="text-muted-foreground">Gestioná competiciones e inscripciones</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Usuarios totales", value: (stats as any)?.count ?? 0, icon: Users },
          { label: "Competiciones", value: competitions?.length ?? 0, icon: Trophy },
          { label: "Inscripciones pendientes", value: pendingParticipants?.length ?? 0, icon: ShieldCheck },
          { label: "Competitions activas", value: competitions?.filter(c => c.status === "active").length ?? 0, icon: Trophy },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xl font-black">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="matches">
        <TabsList className="rounded-full">
          <TabsTrigger value="matches" className="rounded-full gap-2">
            Partidos
          </TabsTrigger>
          <TabsTrigger value="participants" className="rounded-full gap-2">
            <Users className="h-4 w-4" /> Inscripciones
            {(pendingParticipants?.length ?? 0) > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingParticipants!.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="competitions" className="rounded-full gap-2">
            <Trophy className="h-4 w-4" /> Competiciones
          </TabsTrigger>
          <TabsTrigger value="specials" className="rounded-full gap-2">
            <Star className="h-4 w-4" /> Especiales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-6">
          <MatchesAdmin
            competitions={(competitions ?? []) as any}
            allMatches={(matches ?? []) as Match[]}
          />
        </TabsContent>

        <TabsContent value="participants" className="mt-6">
          <ParticipantsAdmin participants={pendingParticipants ?? []} adminId={user.id} />
        </TabsContent>

        <TabsContent value="competitions" className="mt-6">
          <CompetitionsAdmin competitions={competitions ?? []} />
        </TabsContent>

        <TabsContent value="specials" className="mt-6">
          <SpecialPredictionsAdmin
            competitions={(competitions ?? []) as any}
            specialPredictionCounts={specialPredictionCounts}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
