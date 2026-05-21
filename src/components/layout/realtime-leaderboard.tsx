"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Props {
  competitionId: string
}

export function RealtimeLeaderboard({ competitionId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`leaderboard-${competitionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `competition_id=eq.${competitionId}`,
        },
        (payload) => {
          if (payload.new.status === "finished" && payload.old.status !== "finished") {
            toast.info(
              `Finalizó ${payload.new.home_team} ${payload.new.home_score} - ${payload.new.away_score} ${payload.new.away_team}`,
              { description: "Tabla de posiciones actualizada" }
            )
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [competitionId, router])

  return null
}
