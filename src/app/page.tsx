import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Trophy, Users, BarChart3, Coins, Zap, Globe } from "lucide-react"

const FEATURES = [
  { icon: Trophy, title: "Predicciones en tiempo real", desc: "Carga tus marcadores antes de cada partido y sigue los resultados en vivo." },
  { icon: Users, title: "Pronos públicos y privados", desc: "Crea grupos con amigos o únete a pronos públicos de cualquier parte del mundo." },
  { icon: BarChart3, title: "Rankings globales", desc: "Compite en tu prono y también en el ranking global de la competición." },
  { icon: Coins, title: "Sistema de monedas", desc: "Gana monedas por cada acierto y úsalas en power-ups y duelos." },
  { icon: Zap, title: "Power-ups estratégicos", desc: "Doble puntos, cambio tardío, espía y comodín para darle más emoción." },
  { icon: Globe, title: "Múltiples competiciones", desc: "Mundial, Champions League, Copa América y más torneos en una sola plataforma." },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-black">
            <span className="text-primary">fulbo</span>
            <span className="text-muted-foreground">.io</span>
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className={cn(buttonVariants(), "rounded-full font-semibold")}>
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.769_0.188_65/0.12)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            ⚽ Mundial 2026 — ¡Ya disponible!
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
            Predice.<br />
            <span className="text-primary">Compite.</span><br />
            Gana.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10">
            La forma más divertida de vivir los torneos de fútbol. Crea tu prono, invita a tus amigos y demuestra que sabes más de fútbol que todos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "rounded-full h-14 px-8 text-base font-bold")}>
              Crear cuenta gratis
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full h-14 px-8 text-base font-semibold")}>
              Ver cómo funciona
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20 w-full">
        <h2 className="text-3xl font-black text-center mb-4">Todo lo que necesitas</h2>
        <p className="text-muted-foreground text-center mb-12">Una plataforma completa para vivir el fútbol con tus amigos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20 w-full">
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-black mb-4">¿Listo para demostrar que sabes de fútbol?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Gratis, sin apuestas de dinero. Solo pura pasión por el fútbol.</p>
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "rounded-full h-14 px-10 text-base font-bold")}>
            Empezar ahora — Es gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-primary">fulbo.io</span> — Solo para entretenimiento · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
