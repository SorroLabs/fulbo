"use client"

import { useTheme } from "next-themes"

const TINTS = {
  light: { exact: "#d4ffb3", result: "#fff3b1", wrong: "#ffbeb2" },
  dark:  { exact: "rgb(5 46 22 / 0.55)", result: "rgb(66 32 6 / 0.55)", wrong: "rgb(69 10 10 / 0.55)" },
}

export function useTint(type: "exact" | "result" | "wrong" | undefined) {
  const { resolvedTheme } = useTheme()
  if (!type) return undefined
  return TINTS[resolvedTheme === "dark" ? "dark" : "light"][type]
}
