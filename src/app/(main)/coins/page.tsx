import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, Clock, Zap, Eye, Shield, Star, Trophy, CheckCircle } from "lucide-react"

const POWER_UPS = [
  {
    icon: Clock,
    name: "Cambio tardío",
    cost: 20,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "Editá tu predicción hasta 2 minutos antes del partido, incluso cuando ya está bloqueada.",
    detail: "Perfecto para cuando querés esperar a las alineaciones confirmadas antes de pronosticar.",
  },
  {
    icon: Zap,
    name: "Doble puntos",
    cost: 15,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    description: "Duplicá los puntos que ganés en un partido específico.",
    detail: "Si acertás el marcador exacto obtenés 6 puntos en vez de 3. Si acertás el resultado, 2 en vez de 1.",
  },
  {
    icon: Eye,
    name: "Espía",
    cost: 15,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "Mirá la predicción de otro participante antes de que empiece el partido.",
    detail: "Además te permite editar tu propia predicción hasta 2 minutos antes del partido, como el Cambio tardío.",
  },
  {
    icon: Shield,
    name: "Comodín",
    cost: 25,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    description: "Protegé tu predicción: si el partido termina diferente a lo pronosticado, no perdés posición.",
    detail: "No suma puntos extra, pero evita que un resultado inesperado te aleje del podio.",
  },
]

const HOW_TO_EARN = [
  { action: "Unirse a un prono", reward: "100 🪙", icon: Trophy },
  { action: "Marcador exacto", reward: "3 🪙", icon: Star },
  { action: "Resultado correcto (1-X-2)", reward: "1 🪙", icon: CheckCircle },
  { action: "Predecir todos los partidos de una fase", reward: "10 🪙", icon: Zap },
  { action: "Mejor predictor de la fecha (1er lugar)", reward: "15 🪙", icon: Trophy },
]

export default function CoinsPage() {
  return (
    <div className="space-y-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Coins className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-black">Monedas & Power-ups</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Ganá monedas prediciendo partidos y usálas para activar ventajas estratégicas dentro de tu prono.
        </p>
      </div>

      {/* How to earn */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">¿Cómo ganás monedas?</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          {HOW_TO_EARN.map(({ action, reward, icon: Icon }) => (
            <div key={action} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{action}</span>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30 font-bold text-sm">{reward}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Power-ups */}
      <div>
        <h2 className="text-lg font-bold mb-4">Power-ups disponibles</h2>
        <div className="space-y-3">
          {POWER_UPS.map(({ icon: Icon, name, cost, color, bg, description, detail }) => (
            <Card key={name} className="overflow-hidden">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm">{name}</p>
                      <Badge variant="outline" className="text-primary border-primary/30 font-bold text-xs shrink-0">
                        {cost} 🪙
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5 text-center">
          <p className="text-sm font-semibold mb-1">¿Querés ver tu saldo actual?</p>
          <p className="text-xs text-muted-foreground">
            Entrá a cualquier prono y tocá la pestaña <strong>Monedas</strong> para ver tu balance, historial y power-ups activos en ese prono.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
