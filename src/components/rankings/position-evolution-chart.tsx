"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

const COLORS = ["#f59e0b", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#fb923c", "#38bdf8", "#4ade80", "#e879f9", "#facc15"]

interface Props {
  snapshots: any[]
  currentUserId: string | null
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
}

export function PositionEvolutionChart({ snapshots, currentUserId }: Props) {
  const { chartData, allPlayers, defaultSelected } = useMemo(() => {
    if (!snapshots.length) return { chartData: [], allPlayers: [], defaultSelected: new Set<string>() }

    // Collect all unique players across all snapshots
    const playerMap = new Map<string, { id: string; name: string }>()
    for (const s of snapshots) {
      for (const e of (s.snapshot_data as any[])) {
        if (!playerMap.has(e.user_id))
          playerMap.set(e.user_id, { id: e.user_id, name: e.full_name ?? "Usuario" })
      }
    }
    const allPlayers = [...playerMap.values()]

    // Default: top 10 from the latest snapshot
    const latest = (snapshots[snapshots.length - 1]?.snapshot_data as any[]) ?? []
    const defaultSelected = new Set<string>(latest.slice(0, 10).map((e: any) => e.user_id))
    if (currentUserId && playerMap.has(currentUserId) && defaultSelected.size < 10)
      defaultSelected.add(currentUserId)

    const chartData = snapshots.map((s, i) => {
      const entry: Record<string, any> = {
        label: `P${i + 1}`,
        matchLabel: s.matches
          ? `${s.matches.home_team?.slice(0, 3).toUpperCase()} - ${s.matches.away_team?.slice(0, 3).toUpperCase()}`
          : `Partido ${i + 1}`,
      }
      for (const e of (s.snapshot_data as any[])) entry[e.user_id] = e.rank
      return entry
    })

    return { chartData, allPlayers, defaultSelected }
  }, [snapshots, currentUserId])

  const [selected, setSelected] = useState<Set<string>>(() => defaultSelected)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else if (next.size < 10) { next.add(id) }
      return next
    })
  }

  const activePlayers = allPlayers.filter(p => selected.has(p.id))

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        El gráfico estará disponible cuando finalicen los primeros partidos.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 36, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#888" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              reversed
              domain={[1, allPlayers.length || 1]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#888" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: 12,
              }}
              formatter={(value: any, name: any) => {
                const player = allPlayers.find(p => p.id === String(name))
                return [`#${value}`, player?.name ?? String(name)]
              }}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.matchLabel ?? _label}
            />
            {activePlayers.map(player => {
              const colorIndex = allPlayers.findIndex(p => p.id === player.id)
              const color = COLORS[colorIndex % COLORS.length]
              const isMe = player.id === currentUserId
              const ini = initials(player.name)
              return (
                <Line
                  key={player.id}
                  type="natural"
                  dataKey={player.id}
                  stroke={color}
                  strokeWidth={isMe ? 3 : 1.5}
                  connectNulls
                  activeDot={{ r: 5, fill: color }}
                  dot={(props: any) => {
                    const { cx, cy, index } = props
                    if (cx == null || cy == null) return <g key={`d-${player.id}-${index}`} />
                    if (index !== chartData.length - 1)
                      return <circle key={`d-${player.id}-${index}`} cx={cx} cy={cy} r={2} fill={color} opacity={0.4} />
                    return (
                      <g key={`d-${player.id}-${index}`}>
                        <circle cx={cx} cy={cy} r={13} fill={color} stroke="hsl(var(--background))" strokeWidth={2} />
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="bold" fill="white">
                          {ini}
                        </text>
                      </g>
                    )
                  }}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Player selector chips */}
      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/50">
        {allPlayers.map(player => {
          const colorIndex = allPlayers.findIndex(p => p.id === player.id)
          const color = COLORS[colorIndex % COLORS.length]
          const isSelected = selected.has(player.id)
          const isMe = player.id === currentUserId
          const maxReached = selected.size >= 10 && !isSelected
          const firstName = player.name.split(" ")[0]
          return (
            <button
              key={player.id}
              onClick={() => toggle(player.id)}
              disabled={maxReached}
              title={maxReached ? "Máximo 10 participantes" : player.name}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                isSelected ? "border-transparent text-white shadow-sm" : "border-border text-muted-foreground bg-muted/30 hover:bg-muted/60",
                maxReached && "opacity-30 cursor-not-allowed pointer-events-none",
              )}
              style={isSelected ? { backgroundColor: color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.6)" : color }}
              />
              {firstName}{isMe ? " (tú)" : ""}
            </button>
          )
        })}
        {selected.size >= 10 && (
          <span className="text-xs text-muted-foreground self-center ml-1">Máx. 10</span>
        )}
      </div>
    </div>
  )
}
