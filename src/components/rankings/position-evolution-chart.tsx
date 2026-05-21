"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { useMemo } from "react"

interface Props {
  snapshots: any[]
  currentUserId: string | null
}

const COLORS = ["#f59e0b", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#fb923c", "#38bdf8", "#4ade80", "#e879f9", "#facc15"]

export function PositionEvolutionChart({ snapshots, currentUserId }: Props) {
  const { chartData, players } = useMemo(() => {
    if (!snapshots.length) return { chartData: [], players: [] }

    // Collect all unique players from snapshots
    const playerMap = new Map<string, { id: string; name: string }>()
    snapshots.forEach(s => {
      const data = s.snapshot_data as any[]
      data.slice(0, 10).forEach((e: any) => {
        if (!playerMap.has(e.user_id)) {
          playerMap.set(e.user_id, { id: e.user_id, name: e.full_name ?? "Usuario" })
        }
      })
    })
    const players = [...playerMap.values()]

    const chartData = snapshots.map((s, i) => {
      const data = s.snapshot_data as any[]
      const entry: Record<string, any> = {
        match: `J${i + 1}`,
        matchLabel: `${s.matches?.home_team?.slice(0, 3)} vs ${s.matches?.away_team?.slice(0, 3)}`,
      }
      data.forEach((e: any) => {
        entry[e.user_id] = e.rank
      })
      return entry
    })

    return { chartData, players }
  }, [snapshots])

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        El gráfico estará disponible cuando finalicen los primeros partidos.
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="match"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[1, players.length]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Posición", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              fontSize: 12,
            }}
            formatter={(value: any, name: any) => {
              const player = players.find(p => p.id === String(name))
              return [`#${value}`, player?.name ?? String(name)]
            }}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.matchLabel ?? label}
          />
          <Legend
            formatter={(value) => players.find(p => p.id === value)?.name ?? value}
            wrapperStyle={{ fontSize: 11 }}
          />
          {players.map((player, i) => (
            <Line
              key={player.id}
              type="monotone"
              dataKey={player.id}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={player.id === currentUserId ? 3 : 1.5}
              dot={false}
              activeDot={{ r: 5 }}
              strokeDasharray={player.id === currentUserId ? undefined : undefined}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
