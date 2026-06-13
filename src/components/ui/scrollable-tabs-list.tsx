"use client"

import { useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function ScrollableTabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(true)

  function check() {
    const el = scrollRef.current
    if (!el) return
    setShowLeft(el.scrollLeft > 2)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }

  useEffect(() => {
    check()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", check); ro.disconnect() }
  }, [])

  return (
    <div className={cn("relative mb-6", className)}>
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {children}
      </div>
      <div className={cn(
        "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent z-10 transition-opacity duration-200",
        showLeft ? "opacity-100" : "opacity-0"
      )} />
      <div className={cn(
        "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent z-10 transition-opacity duration-200",
        showRight ? "opacity-100" : "opacity-0"
      )} />
    </div>
  )
}
