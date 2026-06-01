"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

// On first visit (no stored preference), applies theme based on local time:
// 6:00–17:59 → light, 18:00–5:59 → dark.
// Once the user manually changes the theme, their choice is respected forever.
export function ThemeByTime() {
  const { setTheme } = useTheme()

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored) return // respect user's explicit choice
    const hour = new Date().getHours()
    setTheme(hour >= 6 && hour < 18 ? "light" : "dark")
  }, [setTheme])

  return null
}
