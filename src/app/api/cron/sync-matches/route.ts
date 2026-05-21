import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getFixtures, getLiveFixtures, mapApiFixtureToMatch } from "@/lib/api-football"

// Called by Vercel Cron: every minute during active matches, once/day otherwise
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all active competitions with API integration
  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, api_league_id, season, status")
    .in("status", ["upcoming", "active"])
    .not("api_league_id", "is", null)

  if (!competitions?.length) return NextResponse.json({ synced: 0 })

  let synced = 0
  const today = new Date().toISOString().split("T")[0]

  for (const comp of competitions) {
    try {
      // Check if there are live matches first
      const liveFixtures = await getLiveFixtures(comp.api_league_id)

      const fixturesToProcess = liveFixtures.length > 0
        ? liveFixtures
        : await getFixtures(comp.api_league_id, parseInt(comp.season), today)

      for (const fixture of fixturesToProcess) {
        const matchData = mapApiFixtureToMatch(fixture, comp.id)

        // Upsert match
        const { data: match } = await supabase
          .from("matches")
          .upsert(matchData, { onConflict: "api_match_id" })
          .select("id, status")
          .single()

        // If just finished, score predictions
        if (match?.status === "finished" && matchData.status === "finished") {
          await supabase.rpc("score_match", { p_match_id: match.id })

          // Take leaderboard snapshot
          const { data: leaderboard } = await supabase.rpc("get_global_leaderboard", {
            p_competition_id: comp.id,
            p_limit: 50,
          })

          if (leaderboard?.length) {
            await supabase.from("leaderboard_snapshots").insert({
              competition_id: comp.id,
              match_id: match.id,
              snapshot_data: leaderboard,
            })
          }
        }
        synced++
      }
    } catch (err) {
      console.error(`Error syncing competition ${comp.id}:`, err)
    }
  }

  return NextResponse.json({ synced, timestamp: new Date().toISOString() })
}
