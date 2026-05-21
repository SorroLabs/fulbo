"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Bug } from "lucide-react"
import { toast } from "sonner"
import { syncMatches, testApiFootball } from "@/app/actions/sync"

export function SyncMatchesButton() {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  async function handleSync() {
    setLoading(true)
    const res = await syncMatches()
    if ("error" in res) toast.error(res.error)
    else toast.success(`Sincronizados: ${res.synced}`, { duration: 5000 })
    setLoading(false)
  }

  async function handleTest() {
    setTesting(true)
    const res = await testApiFootball(1, 2026)
    toast.info(JSON.stringify(res), { duration: 15000 })
    setTesting(false)
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handleSync} disabled={loading} variant="outline" className="rounded-full gap-2">
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sincronizando..." : "Sync partidos"}
      </Button>
      <Button onClick={handleTest} disabled={testing} variant="ghost" size="icon" className="rounded-full" title="Test API">
        <Bug className="h-4 w-4" />
      </Button>
    </div>
  )
}
