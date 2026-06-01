"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Calendar } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  competitions: any[]
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  upcoming: { label: "Próximamente", variant: "secondary" },
  active: { label: "En curso", variant: "default" },
  finished: { label: "Finalizado", variant: "outline" },
}

export function CompetitionsAdmin({ competitions }: Props) {
  if (!competitions.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay competiciones creadas. Usa el editor SQL de Supabase para crear la primera.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {competitions.map(c => (
        <Card key={c.id}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{c.name}</p>
                  <Badge variant={STATUS_LABELS[c.status]?.variant}>{STATUS_LABELS[c.status]?.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  {c.season} · Inicia: {new Date(c.start_date).toLocaleDateString("es")}
                </p>
              </div>
              <Link href={`/competitions/${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}>
                Ver
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
