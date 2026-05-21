"use server"

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { getFixtures, getLiveFixtures, mapApiFixtureToMatch } from "@/lib/api-football"

export async function testApiFootball(leagueId: number, season: number) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { error: "No autenticado" }
  const { data: profile } = await supabaseAuth.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { error: "Sin permisos" }

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`,
    { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! } }
  )
  const data = await res.json()
  return {
    status: res.status,
    errors: data.errors,
    results: data.results,
    firstFixture: data.response?.[0] ?? null,
  }
}

export async function syncMatches() {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: profile } = await supabaseAuth.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { error: "Sin permisos" }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, api_league_id, season, status")
    .in("status", ["upcoming", "active"])
    .not("api_league_id", "is", null)

  if (!competitions?.length) return { synced: 0 }

  let synced = 0
  const debug: any[] = []

  for (const comp of competitions) {
    try {
      const liveFixtures = comp.status === "active" ? await getLiveFixtures(comp.api_league_id) : []
      const allFixtures = liveFixtures.length > 0
        ? liveFixtures
        : await getFixtures(comp.api_league_id, parseInt(comp.season))
      const fixturesToProcess = allFixtures
      debug.push({ comp: comp.id, league: comp.api_league_id, season: comp.season, fixtures: fixturesToProcess.length })

      for (const fixture of fixturesToProcess) {
        const matchData = mapApiFixtureToMatch(fixture, comp.id)
        const { data: match } = await supabase
          .from("matches")
          .upsert(matchData, { onConflict: "api_match_id" })
          .select("id, status")
          .single()

        if (match?.status === "finished" && matchData.status === "finished") {
          await supabase.rpc("score_match", { p_match_id: match.id })
          const { data: leaderboard } = await supabase.rpc("get_global_leaderboard", {
            p_competition_id: comp.id, p_limit: 50,
          })
          if (leaderboard?.length) {
            await supabase.from("leaderboard_snapshots").insert({
              competition_id: comp.id, match_id: match.id, snapshot_data: leaderboard,
            })
          }
        }
        synced++
      }
    } catch (err: any) {
      debug.push({ comp: comp.id, error: err?.message ?? String(err) })
    }
  }

  return { synced, debug }
}
