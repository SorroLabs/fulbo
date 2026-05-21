import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, TrendingUp, TrendingDown, Zap } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PowerUpStore } from "@/components/coins/power-up-store"

export default async function CoinsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabase.from("profiles").select("coins").eq("id", user.id).single(),
    supabase
      .from("coin_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const totalEarned = transactions?.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0) ?? 0
  const totalSpent = transactions?.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0) ?? 0

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-black mb-1">Mis monedas</h1>
        <p className="text-muted-foreground">Ganá monedas prediciendo y usálas en power-ups</p>
      </div>

      {/* Balance */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance actual</p>
              <div className="flex items-center gap-2">
                <Coins className="h-8 w-8 text-primary" />
                <span className="text-5xl font-black text-primary">{profile?.coins ?? 0}</span>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2 justify-end text-emerald-500">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold">+{totalEarned} ganadas</span>
              </div>
              <div className="flex items-center gap-2 justify-end text-red-500">
                <TrendingDown className="h-4 w-4" />
                <span className="font-bold">-{totalSpent} gastadas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to earn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Cómo ganar más monedas?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { action: "Marcador exacto", reward: "+3 🪙" },
            { action: "Resultado correcto", reward: "+1 🪙" },
            { action: "Predicción especial acertada", reward: "+10 🪙" },
            { action: "Racha de 3 exactos consecutivos", reward: "+5 🪙 bonus" },
            { action: "Racha de 5 exactos consecutivos", reward: "+10 🪙 bonus" },
            { action: "Predecir todos los partidos de una jornada", reward: "+2 🪙" },
            { action: "Invitar un amigo que se registra", reward: "+5 🪙" },
          ].map(({ action, reward }) => (
            <div key={action} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{action}</span>
              <Badge variant="outline" className="text-primary border-primary/30 font-bold">{reward}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="powerups">
        <TabsList className="rounded-full">
          <TabsTrigger value="powerups" className="rounded-full gap-2">
            <Zap className="h-4 w-4" /> Power-ups
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full gap-2">
            <Coins className="h-4 w-4" /> Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="powerups" className="mt-6">
          <PowerUpStore userId={user.id} userCoins={profile?.coins ?? 0} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="pt-4 divide-y divide-border/50">
              {transactions?.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{t.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`font-black text-base ${t.amount > 0 ? "text-primary" : "text-red-500"}`}>
                    {t.amount > 0 ? "+" : ""}{t.amount} 🪙
                  </span>
                </div>
              ))}
              {!transactions?.length && (
                <p className="text-center text-muted-foreground py-8">No hay transacciones aún.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
