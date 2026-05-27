import { Card, CardContent } from "@/components/ui/card"
import { Coins, TrendingUp, TrendingDown, Clock, Zap, Eye, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { POWER_UP_LABELS } from "@/types"
import type { PowerUpUse, CoinTransaction } from "@/types"

interface Props {
  coinsInProno: number
  transactions: CoinTransaction[]
  powerUpUses: PowerUpUse[]
}

const POWER_UP_ICONS = {
  late_change: Clock,
  double_points: Zap,
  spy: Eye,
  wildcard: Shield,
}

export function PronoCoinsTab({ coinsInProno, transactions, powerUpUses }: Props) {
  const earned = transactions.filter(t => t.type === "earn" || t.type === "admin_grant").reduce((a, t) => a + t.amount, 0)
  const spent = transactions.filter(t => t.type === "spend").reduce((a, t) => a + t.amount, 0)

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Balance */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 pb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo en este prono</p>
            <p className="text-4xl font-black text-primary mt-1">{coinsInProno} 🪙</p>
          </div>
          <div className="space-y-2 text-right">
            <div className="flex items-center justify-end gap-1.5 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">+{earned}</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 text-red-500">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">-{spent}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active power-ups */}
      {powerUpUses.length > 0 && (
        <div>
          <h3 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Power-ups activados</h3>
          <div className="space-y-2">
            {powerUpUses.map(pu => {
              const Icon = POWER_UP_ICONS[pu.type]
              return (
                <div key={pu.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-muted/30">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{POWER_UP_LABELS[pu.type]}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pu.used_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-xs text-red-500 font-bold shrink-0">-{pu.coins_spent} 🪙</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h3 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Historial</h3>
        <Card>
          <CardContent className="pt-2 divide-y divide-border/50">
            {transactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Todavía no hay movimientos.</p>
            )}
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{t.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={cn(
                  "font-black text-base",
                  t.type === "spend" ? "text-red-500" : "text-primary"
                )}>
                  {t.type === "spend" ? "-" : "+"}{t.amount} 🪙
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
