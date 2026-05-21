import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, CheckCircle, XCircle, TrendingUp } from "lucide-react"
import { UserAnalyticsChart } from "@/components/rankings/user-analytics-chart"

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: competition }, { data: predictions }, { data: powerUps }, { data: coins }] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase
      .from("predictions")
      .select("*, matches(home_team, away_team, phase, match_date)")
      .eq("user_id", user.id)
      .eq("competition_id", id)
      .not("points_earned", "is", null),
    supabase.from("power_up_uses").select("type, coins_spent").eq("user_id", user.id),
    supabase
      .from("coin_transactions")
      .select("amount, type, reason, created_at")
      .eq("user_id", user.id)
      .eq("competition_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  if (!competition) notFound()

  const total = predictions?.length ?? 0
  const exact = predictions?.filter(p => {
    const pts = p.points_earned ?? 0
    return [3, 5, 6, 8, 10, 16].includes(pts)
  }).length ?? 0
  const correct = predictions?.filter(p => [1, 2, 3].includes(p.points_earned ?? 0)).length ?? 0
  const wrong = predictions?.filter(p => p.points_earned === 0).length ?? 0
  const totalPts = predictions?.reduce((acc, p) => acc + (p.points_earned ?? 0), 0) ?? 0
  const accuracy = total > 0 ? Math.round(((exact + correct) / total) * 100) : 0

  const byPhase = predictions?.reduce((acc: any, p: any) => {
    const phase = p.matches?.phase ?? "unknown"
    if (!acc[phase]) acc[phase] = { exact: 0, correct: 0, wrong: 0, total: 0 }
    acc[phase].total++
    const pts = p.points_earned ?? 0
    if ([3, 5, 6, 8, 10, 16].includes(pts)) acc[phase].exact++
    else if ([1, 2, 3].includes(pts)) acc[phase].correct++
    else acc[phase].wrong++
    return acc
  }, {})

  const PHASE_LABELS: Record<string, string> = {
    groups: "Grupos", round_of_32: "Ronda 32", round_of_16: "Octavos",
    quarterfinals: "Cuartos", semifinals: "Semis", third_place: "3° puesto", final: "Final",
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1">Mis analytics</h1>
        <p className="text-muted-foreground">{competition.name} · {competition.season}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Puntos totales", value: totalPts, icon: TrendingUp, color: "text-primary" },
          { label: "Exactos", value: exact, icon: Target, color: "text-emerald-500" },
          { label: "Correctos", value: correct, icon: CheckCircle, color: "text-blue-500" },
          { label: "Fallidos", value: wrong, icon: XCircle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accuracy gauge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Precisión general</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="rotate-[-90deg]">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="3"
                  strokeDasharray={`${accuracy} ${100 - accuracy}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black">{accuracy}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { label: "Exactos", count: exact, color: "bg-emerald-500" },
                { label: "Correctos", count: correct, color: "bg-blue-500" },
                { label: "Fallidos", count: wrong, color: "bg-red-400" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-sm flex-1">{label}</span>
                  <span className="font-bold text-sm">{count}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {total > 0 ? Math.round((count / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By phase */}
      {Object.keys(byPhase ?? {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rendimiento por fase</CardTitle>
          </CardHeader>
          <CardContent>
            <UserAnalyticsChart byPhase={byPhase} phaseLabels={PHASE_LABELS} />
          </CardContent>
        </Card>
      )}

      {/* Coin history */}
      {(coins?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas monedas ganadas</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            {coins!.map((t: any) => (
              <div key={t.created_at} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{t.reason}</span>
                <span className={`font-bold text-sm ${t.amount > 0 ? "text-primary" : "text-red-500"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount} 🪙
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
