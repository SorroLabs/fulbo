import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, Eye, Shield, Star, Trophy, CheckCircle, UserPlus, Target, HelpCircle } from "lucide-react"

const SCORING_BREAKDOWN = [
  { label: "Resultado correcto", desc: "Ganador o empate acertado", pts: "+5 pts", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Goles local exactos", desc: "El marcador del equipo local es exacto", pts: "+2 pts", color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Goles visitante exactos", desc: "El marcador del visitante es exacto", pts: "+2 pts", color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Diferencia de goles", desc: "La diferencia entre ambos equipos es la misma", pts: "+1 pt", color: "text-purple-500", bg: "bg-purple-500/10" },
]

const EXAMPLES = [
  { real: "3 - 1", pred: "3 - 1", pts: 10, label: "¡Exacto! resultado + local + visitante + diferencia" },
  { real: "3 - 1", pred: "2 - 0", pts: 6, label: "Resultado + diferencia (ambos ganan por 2)" },
  { real: "3 - 1", pred: "1 - 0", pts: 5, label: "Solo resultado correcto" },
  { real: "3 - 1", pred: "0 - 1", pts: 2, label: "Solo goles del visitante exactos" },
  { real: "3 - 1", pred: "1 - 2", pts: 0, label: "Resultado incorrecto" },
]

const POWER_UPS = [
  {
    icon: Clock,
    name: "Cambio tardío",
    cost: 20,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    description: "Editá tu predicción hasta 2 minutos antes del partido, incluso cuando ya está bloqueada.",
    detail: "Perfecto para esperar las alineaciones confirmadas antes de pronosticar.",
  },
  {
    icon: Zap,
    name: "Doble puntos",
    cost: 15,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    description: "Duplicá los puntos que ganes en un partido específico.",
    detail: "Si acertás el marcador exacto obtenés 20 pts en vez de 10 (grupos).",
  },
  {
    icon: Eye,
    name: "Espía",
    cost: 15,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    description: "Mirá la predicción de otro participante antes de que empiece el partido.",
    detail: "Además te permite editar tu propia predicción hasta 2 minutos antes, como el Cambio tardío.",
  },
  {
    icon: Shield,
    name: "Comodín",
    cost: 25,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    description: "Si tu predicción no suma ningún punto, el comodín te regala 5 pts (grupos) o 10 pts (eliminatoria).",
    detail: "Ideal para partidos imprevisibles donde querés cubrirte.",
  },
]

const HOW_TO_EARN = [
  { action: "Unirse a un prono", reward: "100 🪙", icon: Trophy },
  { action: "Marcador exacto", reward: "3 🪙", icon: Star },
  { action: "Resultado correcto", reward: "1 🪙", icon: CheckCircle },
  { action: "Predecir todos los partidos de una fase", reward: "10 🪙", icon: Zap },
  { action: "Mejor predictor de la fecha (1° lugar)", reward: "15 🪙", icon: Trophy },
  { action: "Alguien se une con tu link de invitación", reward: "10 🪙", icon: UserPlus },
]

export default function HowToPlayPage() {
  return (
    <div className="space-y-16 max-w-4xl mx-auto">

      {/* ── SECCIÓN 1: PUNTOS ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Cómo se puntúa cada partido</h2>
            <p className="text-sm text-muted-foreground">Máximo 10 pts en grupos · 20 pts en eliminatorias (todo ×2)</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Izquierda: desglose */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Desglose de puntos</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {SCORING_BREAKDOWN.map(({ label, desc, pts, color, bg }) => (
                <div key={label} className="flex items-center gap-3 py-3">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-xs font-black ${color}`}>{pts.split(" ")[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Badge variant="outline" className={`${color} border-current/30 font-bold text-xs shrink-0`}>{pts}</Badge>
                </div>
              ))}
              <div className="pt-3 pb-1 flex items-start gap-2">
                <span className="text-xs text-muted-foreground">⚡</span>
                <p className="text-xs text-muted-foreground">En fase eliminatoria todos los puntos se <strong>multiplican por 2</strong>.</p>
              </div>
            </CardContent>
          </Card>

          {/* Derecha: ejemplos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Ejemplos — resultado real: 3-1</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {EXAMPLES.map(({ pred, pts, label }) => (
                <div key={pred} className="flex items-center gap-3 py-2.5">
                  <div className="w-14 shrink-0 text-center">
                    <span className="text-sm font-black font-mono">{pred}</span>
                  </div>
                  <p className="flex-1 text-xs text-muted-foreground">{label}</p>
                  <span className={`font-black text-base shrink-0 w-8 text-right ${pts === 10 ? "text-emerald-500" : pts === 0 ? "text-red-400" : "text-primary"}`}>
                    {pts}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Divisor */}
      <div className="border-t border-border/50" />

      {/* ── SECCIÓN 2: MONEDAS ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xl">🪙</span>
          </div>
          <div>
            <h2 className="text-2xl font-black">Monedas & Power-ups</h2>
            <p className="text-sm text-muted-foreground">Ganás monedas prediciendo y las usás para activar ventajas estratégicas.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Izquierda: cómo ganar */}
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

          {/* Derecha: power-ups */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide px-1">Power-ups disponibles</p>
            {POWER_UPS.map(({ icon: Icon, name, cost, color, bg, description, detail }) => (
              <Card key={name}>
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
      </section>

    </div>
  )
}
