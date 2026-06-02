import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendPushToUser } from "@/lib/notifications"

// Runs every 5 minutes. Finds matches starting in 25–35 min and notifies
// users who haven't submitted a prediction yet.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000).toISOString()

  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, competition_id, match_date")
    .eq("status", "upcoming")
    .gte("match_date", windowStart)
    .lte("match_date", windowEnd)

  if (!upcomingMatches?.length) return NextResponse.json({ notified: 0 })

  let totalNotified = 0

  for (const match of upcomingMatches) {
    // Get all members across all pronos in this competition
    const { data: pronos } = await supabase
      .from("pronos")
      .select("id")
      .eq("competition_id", match.competition_id)
    if (!pronos?.length) continue

    const { data: members } = await supabase
      .from("prono_members")
      .select("user_id")
      .in("prono_id", pronos.map((p: any) => p.id))
    if (!members?.length) continue

    const allUserIds = [...new Set(members.map((m: any) => m.user_id))] as string[]

    // Find who already has a prediction
    const { data: existing } = await supabase
      .from("predictions")
      .select("user_id")
      .eq("match_id", match.id)
      .in("user_id", allUserIds)

    const alreadyPredicted = new Set((existing ?? []).map((p: any) => p.user_id))
    const toNotify = allUserIds.filter((id) => !alreadyPredicted.has(id))

    const matchTime = new Date(match.match_date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })

    await Promise.allSettled(
      toNotify.map((userId) =>
        sendPushToUser(userId, {
          title: `⏰ ${match.home_team} vs ${match.away_team}`,
          body: `El partido comienza a las ${matchTime}. ¡Todavía puedes predecir!`,
          url: `/pronos`,
        })
      )
    )
    totalNotified += toNotify.length
  }

  return NextResponse.json({ notified: totalNotified })
}
