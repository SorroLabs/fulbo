"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface Props {
  byPhase: Record<string, { exact: number; correct: number; wrong: number; total: number }>
  phaseLabels: Record<string, string>
}

const PHASE_ORDER = ["groups", "round_of_16", "quarterfinals", "semifinals", "third_place", "final"]

export function UserAnalyticsChart({ byPhase, phaseLabels }: Props) {
  const data = PHASE_ORDER.filter(p => byPhase[p]).map(p => ({
    phase: phaseLabels[p] ?? p,
    Exactos: byPhase[p].exact,
    Correctos: byPhase[p].correct,
    Fallidos: byPhase[p].wrong,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="phase" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Exactos" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Correctos" fill="#60a5fa" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Fallidos" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
