const BASE_URL = "https://v3.football.api-sports.io"

async function apiFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`API-Football error: ${res.status}`)
  return res.json()
}

export async function getFixtures(leagueId: number, season: number, date?: string) {
  const params = new URLSearchParams({ league: String(leagueId), season: String(season) })
  if (date) params.set("date", date)
  const data = await apiFetch(`/fixtures?${params}`)
  return data.response ?? []
}

export async function getFixtureById(fixtureId: number) {
  const data = await apiFetch(`/fixtures?id=${fixtureId}`)
  return data.response?.[0] ?? null
}

export async function getLiveFixtures(leagueId: number) {
  const data = await apiFetch(`/fixtures?live=all&league=${leagueId}`)
  return data.response ?? []
}

export function mapApiFixtureToMatch(fixture: any, competitionId: string) {
  const phaseMap: Record<string, string> = {
    "Group Stage": "groups",
    "Round of 32": "round_of_32",
    "Round of 16": "round_of_16",
    "Quarter-finals": "quarterfinals",
    "Semi-finals": "semifinals",
    "3rd Place Final": "third_place",
    "Final": "final",
  }

  return {
    competition_id: competitionId,
    api_match_id: fixture.fixture.id,
    home_team: fixture.teams.home.name,
    away_team: fixture.teams.away.name,
    home_team_logo: fixture.teams.home.logo,
    away_team_logo: fixture.teams.away.logo,
    home_score: fixture.goals.home,
    away_score: fixture.goals.away,
    match_date: fixture.fixture.date,
    phase: phaseMap[fixture.league.round] ?? "groups",
    group_name: fixture.league.round?.startsWith("Group") ? fixture.league.round : null,
    status: fixture.fixture.status.short === "FT" ? "finished"
      : ["1H", "HT", "2H", "ET", "P"].includes(fixture.fixture.status.short) ? "live"
      : "upcoming",
  }
}
