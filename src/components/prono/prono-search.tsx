"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Search, Users, Globe, CheckCircle } from "lucide-react"
import { joinProno } from "@/app/actions/pronos"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Props {
  pronos: any[]
  myPollaIds: string[]
}

export function PronoSearch({ pronos, myPollaIds: initialMyIds }: Props) {
  const [query, setQuery] = useState("")
  const [myIds, setMyIds] = useState(new Set(initialMyIds))
  const [isPending, startTransition] = useTransition()
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = pronos.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.competitions?.name?.toLowerCase().includes(query.toLowerCase())
  )

  function handleJoin(pronoId: string) {
    setJoiningId(pronoId)
    startTransition(async () => {
      const res = await joinProno({ pronoId })
      if (res.error) toast.error(res.error)
      else {
        toast.success("¡Te uniste a el prono!")
        setMyIds(s => new Set([...s, pronoId]))
        router.refresh()
      }
      setJoiningId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o competición..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-10">No se encontraron pronos públicos.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((prono) => {
          const isMember = myIds.has(prono.id)
          return (
            <Card key={prono.id} className={isMember ? "border-primary/30" : "hover:border-border transition-all"}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{prono.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{prono.competitions?.name}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                    <Globe className="h-3 w-3" /> Pública
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {prono.prono_members?.[0]?.count ?? 0} / {prono.max_members}
                  </span>
                  {isMember ? (
                    <Link href={`/pronos/${prono.id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full h-8 gap-1.5 text-xs")}>
                      <CheckCircle className="h-3.5 w-3.5 text-primary" /> Ver prono
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoin(prono.id)}
                      disabled={isPending && joiningId === prono.id}
                      className="rounded-full h-8 text-xs"
                    >
                      {isPending && joiningId === prono.id ? "Uniéndome..." : "Unirme"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
