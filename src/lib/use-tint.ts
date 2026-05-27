"use client"

import { useState, useEffect } from "react"

const TINTS = {
  light: { exact: "#d4ffb3", result: "#fff3b1", wrong: "#ffbeb2" },
  dark:  { exact: "rgb(5 46 22 / 0.55)", result: "rgb(66 32 6 / 0.55)", wrong: "rgb(69 10 10 / 0.55)" },
}

function getIsDark() {
  if (typeof document === "undefined") return false
  return document.documentElement.classList.contains("dark")
}

export function useTint(type: "exact" | "result" | "wrong" | undefined) {
  const [dark, setDark] = useState(getIsDark)

  useEffect(() => {
    setDark(getIsDark())
    const observer = new MutationObserver(() => setDark(getIsDark()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  if (!type) return undefined
  return TINTS[dark ? "dark" : "light"][type]
}
