import { createClient } from "@/lib/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Plus, Users, Lock, Globe, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { JoinPronoDialog } from "@/components/prono/join-prono-dialog"
import { PronoSearch } from "@/components/prono/prono-search"

export default async function PollasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: myPronos }, { data: publicPronos }] = await Promise.all([
    user ? supabase
      .from("prono_members")
      .select("*, pronos(*, competitions(name, status), prono_members(count))")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false }) : { data: [] },
    supabase
      .from("pronos")
      .select("*, competitions(name, status), prono_members(count)")
      .eq("is_public", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const myPollaIds = new Set((myPronos ?? []).map((pm: any) => pm.prono_id))

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1">Pronos</h1>
          <p className="text-muted-foreground">Crea o únete a un prono para competir</p>
        </div>
        <div className="flex gap-3">
          <JoinPronoDialog />
          <Link href="/pronos/nuevo" className={cn(buttonVariants(), "rounded-full gap-2")}>
            <Plus className="h-4 w-4" /> Nuevo prono
          </Link>
        </div>
      </div>

      {/* My pronos */}
      {(myPronos?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Mis pronos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPronos!.map((pm: any) => (
              <Link key={pm.prono_id} href={`/pronos/${pm.pronos?.invite_code}`}>
                <Card className="hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base group-hover:text-primary transition-colors">{pm.pronos?.name}</CardTitle>
                      {pm.pronos?.is_public
                        ? <Badge variant="secondary" className="shrink-0 gap-1"><Globe className="h-3 w-3" /> Público</Badge>
                        : <Badge variant="outline" className="shrink-0 gap-1"><Lock className="h-3 w-3" /> Privado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{pm.pronos?.competitions?.name}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{pm.pronos?.prono_members?.[0]?.count ?? 0} participantes</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Public pronos search */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Pronos públicos
        </h2>
        <PronoSearch pronos={publicPronos ?? []} myPollaIds={[...myPollaIds]} />
      </section>
    </div>
  )
}
