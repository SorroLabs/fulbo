"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { syncMatches } from "@/app/actions/sync"

export function SyncMatchesButton() {
  const [loading, setLoading] = useState(false)

  async function handleSync() {
    setLoading(true)
    const res = await syncMatches()
    if ("error" in res) toast.error(res.error)
    else {
      toast.success(`Sincronizados ${res.synced} partidos`)
      if (res.debug) console.log("Sync debug:", JSON.stringify(res.debug, null, 2))
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleSync} disabled={loading} variant="outline" className="rounded-full gap-2">
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Sincronizando..." : "Sync partidos"}
    </Button>
  )
}
