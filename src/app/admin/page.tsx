import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Users, Trophy, Calendar } from "lucide-react"
import { AdminPanel } from "@/components/admin/admin-panel"
import type { Match } from "@/types"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const [
    { data: competitions },
    { data: userStats },
    { data: matches },
    { data: specialPredCounts },
    { data: pronos },
  ] = await Promise.all([
    supabase.from("competitions").select("*").order("start_date", { ascending: false }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("*").order("match_date"),
    supabase.from("special_predictions").select("competition_id, type"),
    supabase
      .from("pronos")
      .select("id, name, is_public, invite_code, competition_id, created_at, owner_id, profiles(full_name)")
      .order("created_at", { ascending: false }),
  ])

  // Member counts per prono
  const pronoIds = (pronos ?? []).map((p: any) => p.id)
  const { data: memberCounts } = pronoIds.length
    ? await supabase
        .from("prono_members")
        .select("prono_id")
        .in("prono_id", pronoIds)
    : { data: [] }

  const countByProno = new Map<string, number>()
  for (const m of memberCounts ?? []) {
    countByProno.set(m.prono_id, (countByProno.get(m.prono_id) ?? 0) + 1)
  }

  // Group pronos by competition
  const pronosByCompetition: Record<string, any[]> = {}
  for (const p of pronos ?? []) {
    if (!pronosByCompetition[p.competition_id]) pronosByCompetition[p.competition_id] = []
    pronosByCompetition[p.competition_id].push({
      id: p.id,
      name: p.name,
      is_public: p.is_public,
      invite_code: p.invite_code,
      member_count: countByProno.get(p.id) ?? 0,
      owner_name: (p as any).profiles?.full_name ?? null,
      created_at: p.created_at,
    })
  }

  // Special predictions counts
  const specialPredictionCounts: Record<string, Record<string, number>> = {}
  for (const row of specialPredCounts ?? []) {
    if (!specialPredictionCounts[row.competition_id]) specialPredictionCounts[row.competition_id] = {}
    specialPredictionCounts[row.competition_id][row.type] =
      (specialPredictionCounts[row.competition_id][row.type] ?? 0) + 1
  }

  const totalPronos = (pronos ?? []).length
  const activeComps = (competitions ?? []).filter(c => c.status === "active").length

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-black">Panel de administración</h1>
          <p className="text-muted-foreground">fulbo.co · Mundial 2026</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Usuarios registrados", value: (userStats as any)?.count ?? 0, icon: Users },
          { label: "Competiciones activas", value: activeComps, icon: Trophy },
          { label: "Pronos creados", value: totalPronos, icon: Calendar },
          { label: "Partidos cargados", value: (matches ?? []).length, icon: Calendar },
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

      <AdminPanel
        competitions={(competitions ?? []) as any}
        allMatches={(matches ?? []) as Match[]}
        pronosByCompetition={pronosByCompetition}
        specialPredictionCounts={specialPredictionCounts}
      />
    </div>
  )
}
