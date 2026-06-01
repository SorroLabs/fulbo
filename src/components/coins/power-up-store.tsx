"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Clock, Eye, Shield } from "lucide-react"
import { POWER_UP_COSTS } from "@/types"

const POWER_UPS = [
  {
    type: "late_change" as const,
    icon: Clock,
    label: "Cambio tardío",
    desc: "Modifica tu predicción hasta 2 minutos antes del partido (máx. 3 usos por torneo)",
    limit: "3 usos / torneo",
  },
  {
    type: "double_points" as const,
    icon: Zap,
    label: "Doble puntos",
    desc: "Si aciertas este partido, ganas el doble de puntos",
    limit: "1 por partido",
  },
  {
    type: "spy" as const,
    icon: Eye,
    label: "Espía",
    desc: "Mira la predicción de un rival antes de que cierre el plazo",
    limit: "1 por partido",
  },
  {
    type: "wildcard" as const,
    icon: Shield,
    label: "Comodín",
    desc: "Si fallas el resultado de este partido, igual sumas puntos mínimos",
    limit: "1 por partido",
  },
]

interface Props {
  userId: string
  userCoins: number
}

export function PowerUpStore({ userId, userCoins }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Los power-ups se aplican al cargar una predicción de un partido específico. Elige el power-up desde la tarjeta del partido.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {POWER_UPS.map(({ type, icon: Icon, label, desc, limit }) => {
          const cost = POWER_UP_COSTS[type]
          const canAfford = userCoins >= cost
          return (
            <Card key={type} className={`transition-all ${canAfford ? "hover:border-primary/30" : "opacity-60"}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </div>
                  <Badge variant={canAfford ? "default" : "secondary"} className="shrink-0 font-bold">
                    {cost} 🪙
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">{desc}</p>
                <p className="text-xs text-primary/70 font-medium">{limit}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Los power-ups se activan desde la tarjeta de cada partido al cargar una predicción.
      </p>
    </div>
  )
}
