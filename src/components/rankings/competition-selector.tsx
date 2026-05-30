"use client"

import { useRouter } from "next/navigation"
import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const STATUS_CONFIG = {
  upcoming: { label: "Próximamente", variant: "secondary" as const },
  active:   { label: "En curso",     variant: "default" as const },
  finished: { label: "Finalizado",   variant: "outline" as const },
}

interface Props {
  competitions: { id: string; name: string; season: string; status: string }[]
  selectedId: string
}

export function CompetitionSelector({ competitions, selectedId }: Props) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap gap-2">
      {competitions.map(comp => {
        const cfg = STATUS_CONFIG[comp.status as keyof typeof STATUS_CONFIG]
        const isSelected = comp.id === selectedId
        return (
          <button
            key={comp.id}
            onClick={() => router.push(`/rankings?comp=${comp.id}`)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            )}
          >
            <Trophy className={cn("h-4 w-4", isSelected ? "text-primary-foreground" : "text-primary")} />
            <span>{comp.name}</span>
            <span className={cn("text-xs font-normal", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {comp.season}
            </span>
            <Badge variant={cfg?.variant} className="text-xs h-5 ml-1">{cfg?.label}</Badge>
          </button>
        )
      })}
    </div>
  )
}
