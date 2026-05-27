import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Trophy, Users, Plus, ArrowRight, Calendar } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Competition, Prono } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: competitions }, { data: myPronos }] = await Promise.all([
    supabase.from("competitions").select("*").order("start_date", { ascending: false }),
    user ? supabase
      .from("prono_members")
      .select("prono_id, pronos(*, competitions(name, logo_url, status))")
      .eq("user_id", user.id)
      .limit(5) : { data: [] },
  ])

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    upcoming: { label: "Próximamente", variant: "secondary" },
    active: { label: "En curso", variant: "default" },
    finished: { label: "Finalizado", variant: "outline" },
  }

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-black mb-1">Inicio</h1>
        <p className="text-muted-foreground">Elegí una competición y empezá a predecir</p>
      </div>

      {/* Competitions */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Competiciones
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(competitions as Competition[] | null)?.map(c => (
            <Link key={c.id} href={`/competitions/${c.id}`}>
              <Card className="hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="w-10 h-10 object-contain" />
                      ) : (
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">{c.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{c.season}</p>
                      </div>
                    </div>
                    <Badge variant={statusLabel[c.status]?.variant}>{statusLabel[c.status]?.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(c.start_date).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                      Ver <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!competitions?.length && (
            <p className="text-muted-foreground col-span-3 text-center py-10">No hay competiciones disponibles aún.</p>
          )}
        </div>
      </section>

      {/* My pronos */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Mis pronos
          </h2>
          <Link href="/pronos" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full gap-2")}>
            <Plus className="h-4 w-4" /> Nuevo prono
          </Link>
        </div>
        {myPronos && myPronos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPronos.map((pm: any) => (
              <Link key={pm.prono_id} href={`/pronos/${pm.pronos?.invite_code}`}>
                <Card className="hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">{pm.pronos?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pm.pronos?.competitions?.name}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Todavía no estás en ningún prono</p>
              <p className="text-sm text-muted-foreground mb-4">Creá uno nuevo o buscá un prono público</p>
              <div className="flex justify-center gap-3">
                <Link href="/pronos/nuevo" className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
                  Crear prono
                </Link>
                <Link href="/pronos" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full")}>
                  Buscar pronos
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
