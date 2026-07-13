"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { getTeamFlag } from "@/lib/team-flags"
import type { Match } from "@/types"

/* ── Layout constants ─────────────────────────────── */
const UNIT = 72        // height of one round_of_32 slot (px)
const CARD_H = 52      // match card height (px)
const CARD_W = 116     // match card width (px)
const CON_W = 22       // connector column width (px)
const SF_CON_W = 18    // semi→final connector width (px)
const TOTAL_H = 8 * UNIT  // 576px

type KnockoutPhase =
  | "round_of_32"
  | "round_of_16"
  | "quarterfinals"
  | "semifinals"
  | "final"

const KNOCKOUT_PHASES: KnockoutPhase[] = [
  "round_of_32",
  "round_of_16",
  "quarterfinals",
  "semifinals",
  "final",
]

const PHASE_LABELS: Record<string, string> = {
  round_of_32: "32avos",
  round_of_16: "16avos",
  quarterfinals: "Cuartos",
  semifinals: "Semis",
  final: "Final",
}

/* ── Geometry helpers ─────────────────────────────── */
function slotH(phase: KnockoutPhase): number {
  const idx = KNOCKOUT_PHASES.indexOf(phase)
  return UNIT * Math.pow(2, idx)
}

function cardTopY(phase: KnockoutPhase, index: number): number {
  if (phase === "final") return (TOTAL_H - CARD_H) / 2
  const h = slotH(phase)
  return index * h + (h - CARD_H) / 2
}

function cardCenterY(phase: KnockoutPhase, index: number): number {
  return cardTopY(phase, index) + CARD_H / 2
}

/* ── Team flag ───────────────────────────────────── */
function TeamFlag({ name, logo }: { name: string; logo: string | null }) {
  const src = logo || getTeamFlag(name)
  if (!src) return null
  return (
    <img
      src={src}
      alt={name}
      className="w-3.5 h-3.5 rounded-sm object-cover shrink-0"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
    />
  )
}

/* ── Match card ───────────────────────────────────── */
function MatchCard({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <div
        className="rounded-lg border border-dashed border-border/40 bg-muted/10"
        style={{ width: CARD_W, height: CARD_H }}
      />
    )
  }

  const tbd = (s: string) => s.startsWith("Ganador") || s === "Por definir"
  const home = tbd(match.home_team) ? "Por definir" : match.home_team
  const away = tbd(match.away_team) ? "Por definir" : match.away_team
  const homeWon = match.status === "finished" && match.home_score! > match.away_score!
  const awayWon = match.status === "finished" && match.away_score! > match.home_score!
  const showScore = match.status !== "upcoming"

  return (
    <div
      className="rounded-lg border bg-card shadow-sm overflow-hidden"
      style={{ width: CARD_W, height: CARD_H }}
    >
      {/* Home row */}
      <div className={cn(
        "flex items-center gap-1 px-2 border-b h-1/2",
        homeWon && "bg-primary/5"
      )}>
        {!tbd(match.home_team) && (
          <TeamFlag name={match.home_team} logo={match.home_team_logo} />
        )}
        <span className={cn(
          "text-[10px] leading-tight truncate flex-1",
          homeWon ? "font-bold text-foreground" : "text-muted-foreground font-medium"
        )}>
          {home}
        </span>
        {showScore && (
          <span className={cn(
            "text-[10px] font-bold tabular-nums ml-0.5 shrink-0",
            homeWon ? "text-primary" : "text-muted-foreground"
          )}>
            {match.home_score}
          </span>
        )}
      </div>

      {/* Away row */}
      <div className={cn(
        "flex items-center gap-1 px-2 h-1/2",
        awayWon && "bg-primary/5"
      )}>
        {!tbd(match.away_team) && (
          <TeamFlag name={match.away_team} logo={match.away_team_logo} />
        )}
        <span className={cn(
          "text-[10px] leading-tight truncate flex-1",
          awayWon ? "font-bold text-foreground" : "text-muted-foreground font-medium"
        )}>
          {away}
        </span>
        {showScore && (
          <span className={cn(
            "text-[10px] font-bold tabular-nums ml-0.5 shrink-0",
            awayWon ? "text-primary" : "text-muted-foreground"
          )}>
            {match.away_score}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Column of match cards ────────────────────────── */
function BracketColumn({
  phase,
  matches,
}: {
  phase: KnockoutPhase
  matches: (Match | null)[]
}) {
  return (
    <div className="relative shrink-0" style={{ width: CARD_W, height: TOTAL_H }}>
      {matches.map((m, i) => (
        <div key={m?.id ?? `empty-${i}`} className="absolute" style={{ top: cardTopY(phase, i) }}>
          <MatchCard match={m} />
        </div>
      ))}
    </div>
  )
}

/* ── SVG connector between two adjacent columns ───── */
function Connector({
  fromPhase,
  toPhase,
  fromCount,
  toCount,
  width = CON_W,
}: {
  fromPhase: KnockoutPhase
  toPhase: KnockoutPhase
  fromCount: number
  toCount: number
  width?: number
}) {
  const x = width / 2
  const lines: React.ReactNode[] = []

  if (fromCount > toCount) {
    // Merging: 2 from-matches → 1 to-match (left side of bracket)
    for (let j = 0; j < toCount; j++) {
      const y1 = cardCenterY(fromPhase, 2 * j)
      const y2 = cardCenterY(fromPhase, 2 * j + 1)
      const yMid = (y1 + y2) / 2
      lines.push(
        <g key={j}>
          <line x1={0} y1={y1} x2={x} y2={y1} />
          <line x1={0} y1={y2} x2={x} y2={y2} />
          <line x1={x} y1={y1} x2={x} y2={y2} />
          <line x1={x} y1={yMid} x2={width} y2={yMid} />
        </g>
      )
    }
  } else if (fromCount < toCount) {
    // Branching: 1 from-match → 2 to-matches (right side of bracket)
    for (let j = 0; j < fromCount; j++) {
      const y1 = cardCenterY(toPhase, 2 * j)
      const y2 = cardCenterY(toPhase, 2 * j + 1)
      const yMid = (y1 + y2) / 2
      lines.push(
        <g key={j}>
          <line x1={width} y1={y1} x2={x} y2={y1} />
          <line x1={width} y1={y2} x2={x} y2={y2} />
          <line x1={x} y1={y1} x2={x} y2={y2} />
          <line x1={x} y1={yMid} x2={0} y2={yMid} />
        </g>
      )
    }
  } else {
    // Simple 1→1 (SF ↔ Final)
    const y = TOTAL_H / 2
    lines.push(<line key={0} x1={0} y1={y} x2={width} y2={y} />)
  }

  return (
    <svg
      width={width}
      height={TOTAL_H}
      className="shrink-0 text-border"
      stroke="currentColor"
      strokeWidth={1.5}
      fill="none"
    >
      {lines}
    </svg>
  )
}

/* ── Main BracketView ─────────────────────────────── */
export function BracketView({ matches }: { matches: Match[] }) {
  // Group and sort by phase
  const byPhase: Record<KnockoutPhase, Match[]> = {
    round_of_32: [],
    round_of_16: [],
    quarterfinals: [],
    semifinals: [],
    final: [],
  }

  for (const m of matches) {
    const phase = m.phase as KnockoutPhase
    if (byPhase[phase]) byPhase[phase].push(m)
  }

  for (const phase of KNOCKOUT_PHASES) {
    byPhase[phase].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  }

  const hasR32 = byPhase.round_of_32.length > 0

  // Left phases listed from outermost to innermost
  const leftPhases: KnockoutPhase[] = hasR32
    ? ["round_of_32", "round_of_16", "quarterfinals", "semifinals"]
    : ["round_of_16", "quarterfinals", "semifinals"]

  // Split each phase into left half and right half
  function leftHalf(phase: KnockoutPhase): (Match | null)[] {
    const arr = byPhase[phase]
    return arr.slice(0, Math.ceil(arr.length / 2))
  }

  function rightHalf(phase: KnockoutPhase): (Match | null)[] {
    const arr = byPhase[phase]
    return arr.slice(Math.ceil(arr.length / 2))
  }

  const finalMatch = byPhase.final[0] ?? null

  // Right phases: same as leftPhases but reversed (innermost → outermost)
  const rightPhases = [...leftPhases].reverse()

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      {/* Phase label row */}
      <div className="flex items-center mb-3" style={{ minWidth: "fit-content" }}>
        {leftPhases.map((phase, i) => (
          <React.Fragment key={`lbl-l-${phase}`}>
            <div
              className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ width: CARD_W }}
            >
              {PHASE_LABELS[phase]}
            </div>
            <div style={{ width: i === leftPhases.length - 1 ? SF_CON_W : CON_W }} />
          </React.Fragment>
        ))}
        <div
          className="text-center text-[9px] font-semibold text-primary uppercase tracking-wider"
          style={{ width: CARD_W }}
        >
          Final
        </div>
        {rightPhases.map((phase, i) => (
          <React.Fragment key={`lbl-r-${phase}`}>
            <div style={{ width: i === 0 ? SF_CON_W : CON_W }} />
            <div
              className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ width: CARD_W }}
            >
              {PHASE_LABELS[phase]}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Bracket body */}
      <div className="flex items-start" style={{ minWidth: "fit-content" }}>
        {/* Left side: outermost → innermost */}
        {leftPhases.map((phase, i) => {
          const isLast = i === leftPhases.length - 1
          const nextPhase = leftPhases[i + 1]
          const lMatches = leftHalf(phase)
          const connWidth = isLast ? SF_CON_W : CON_W
          const toCount = isLast ? 1 : leftHalf(nextPhase).length

          return (
            <React.Fragment key={`left-${phase}`}>
              <BracketColumn phase={phase} matches={lMatches} />
              <Connector
                fromPhase={phase}
                toPhase={isLast ? "final" : nextPhase}
                fromCount={lMatches.length}
                toCount={toCount}
                width={connWidth}
              />
            </React.Fragment>
          )
        })}

        {/* Final */}
        <BracketColumn phase="final" matches={[finalMatch]} />

        {/* Right side: innermost → outermost */}
        {rightPhases.map((phase, i) => {
          const isFirst = i === 0
          const prevPhase = rightPhases[i - 1]
          const rMatches = rightHalf(phase)
          const connWidth = isFirst ? SF_CON_W : CON_W
          const fromCount = isFirst ? 1 : rightHalf(prevPhase).length

          return (
            <React.Fragment key={`right-${phase}`}>
              <Connector
                fromPhase={isFirst ? "final" : prevPhase}
                toPhase={phase}
                fromCount={fromCount}
                toCount={rMatches.length}
                width={connWidth}
              />
              <BracketColumn phase={phase} matches={rMatches} />
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
