import { ImageResponse } from "next/og"

export const alt = "fulbo.io — Predicciones de fútbol"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Ball */}
        <div style={{ fontSize: 100, marginBottom: 24 }}>⚽</div>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 0, marginBottom: 20 }}>
          <span style={{ fontSize: 96, fontWeight: 900, color: "#f59e0b", letterSpacing: "-4px" }}>
            fulbo
          </span>
          <span style={{ fontSize: 96, fontWeight: 900, color: "#94a3b8", letterSpacing: "-4px" }}>
            .io
          </span>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 32, color: "#94a3b8", margin: 0, fontWeight: 400 }}>
          Predice · Compite · Gana
        </p>

        {/* Sub */}
        <p style={{ fontSize: 22, color: "#64748b", marginTop: 16, fontWeight: 400 }}>
          La forma más divertida de vivir el Mundial 2026
        </p>
      </div>
    ),
    { ...size }
  )
}
