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
        <p className="text-muted-foreground">Predice, compite y sube al ranking</p>
      </div>

      {/* My pronos — primary section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Mis pronos
          </h2>
          <Link href="/pronos" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full gap-2")}>
            <Plus className="h-4 w-4" /> Nuevo
          </Link>
        </div>
        {myPronos && myPronos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPronos.map((pm: any) => (
              <Link key={pm.prono_id} href={`/pronos/${pm.pronos?.invite_code}`}>
                <Card className="hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group border-primary/20">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-lg group-hover:text-primary transition-colors truncate">{pm.pronos?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pm.pronos?.competitions?.name}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
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
              <p className="text-sm text-muted-foreground mb-4">Crea uno nuevo o busca un prono público</p>
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

      {/* Competitions — secondary section */}
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">Competiciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(competitions as Competition[] | null)?.map(c => (
            <Link key={c.id} href={`/competitions/${c.id}`}>
              <Card className="hover:border-primary/40 transition-all cursor-pointer group h-full">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="w-8 h-8 object-contain shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Trophy className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.season}</p>
                    </div>
                    <Badge variant={statusLabel[c.status]?.variant} className="shrink-0 text-xs">
                      {statusLabel[c.status]?.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!competitions?.length && (
            <p className="text-muted-foreground col-span-3 text-center py-6">No hay competiciones disponibles aún.</p>
          )}
        </div>
      </section>
    </div>
  )
}
