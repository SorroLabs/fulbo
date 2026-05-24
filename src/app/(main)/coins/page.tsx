import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, TrendingUp, TrendingDown, Zap, Trophy } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PowerUpStore } from "@/components/coins/power-up-store"

export default async function CoinsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: wallets }, { data: transactions }] = await Promise.all([
    supabase
      .from("competition_wallets")
      .select("*, competitions(name, season, logo_url, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("coin_transactions")
      .select("*, competitions(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const totalCoins = wallets?.reduce((acc, w) => acc + w.coins, 0) ?? 0
  const totalEarned = transactions?.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0) ?? 0
  const totalSpent = transactions?.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0) ?? 0

  // Use first active wallet for power-up store context
  const activeWallet = wallets?.find(w => w.competitions?.status === "active") ?? wallets?.[0]

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-black mb-1">Mis monedas</h1>
        <p className="text-muted-foreground">Ganá monedas prediciendo y usálas en power-ups</p>
      </div>

      {/* Wallets por competencia */}
      {(wallets?.length ?? 0) > 0 ? (
        <div className="space-y-3">
          {wallets!.map(w => (
            <Card key={w.id} className={w.competitions?.status === "active" ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {w.competitions?.logo_url
                      ? <img src={w.competitions.logo_url} alt="" className="w-8 h-8 object-contain" />
                      : <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center"><Trophy className="h-4 w-4 text-primary" /></div>
                    }
                    <div>
                      <p className="font-semibold text-sm">{w.competitions?.name}</p>
                      <p className="text-xs text-muted-foreground">{w.competitions?.season}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-black text-primary">{w.coins}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(wallets?.length ?? 0) > 1 && (
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Total acumulado</span>
              <span className="font-black text-primary">{totalCoins} 🪙</span>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
            <Coins className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Todavía no tenés monedas</p>
            <p className="text-sm mt-1">Unite a un prono para recibir 100 🪙 de bienvenida</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
              <span className="font-black text-xl">+{totalEarned}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ganadas en total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-red-500">
              <TrendingDown className="h-4 w-4" />
              <span className="font-black text-xl">-{totalSpent}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gastadas en total</p>
          </CardContent>
        </Card>
      </div>

      {/* How to earn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Cómo ganar más monedas?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { action: "Unirse a una competición", reward: "+100 🪙" },
            { action: "Marcador exacto", reward: "+3 🪙" },
            { action: "Resultado correcto", reward: "+1 🪙" },
            { action: "Predicción especial acertada", reward: "+10 🪙" },
            { action: "Racha de 3 exactos", reward: "+5 🪙 bonus" },
            { action: "Racha de 5 exactos", reward: "+10 🪙 bonus" },
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
          <PowerUpStore userId={user.id} userCoins={activeWallet?.coins ?? 0} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="pt-4 divide-y divide-border/50">
              {transactions?.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{t.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.competitions?.name && <span className="text-primary/70">{t.competitions.name} · </span>}
                      {new Date(t.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
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
