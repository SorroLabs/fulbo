import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function RankingsPage() {
  const supabase = await createClient()

  const { data: competition } = await supabase
    .from("competitions")
    .select("id")
    .neq("status", "finished")
    .order("start_date")
    .limit(1)
    .single()

  if (competition) {
    redirect(`/competitions/${competition.id}/rankings`)
  }

  // Fallback: most recent finished competition
  const { data: fallback } = await supabase
    .from("competitions")
    .select("id")
    .eq("status", "finished")
    .order("start_date", { ascending: false })
    .limit(1)
    .single()

  if (fallback) {
    redirect(`/competitions/${fallback.id}/rankings`)
  }

  redirect("/dashboard")
}
