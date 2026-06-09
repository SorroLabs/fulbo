"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Zap, Eye, Shield, Coins, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { activatePowerUp } from "@/app/actions/powerups"
import { POWER_UP_COSTS, POWER_UP_LABELS, POWER_UP_DESCRIPTIONS, type PowerUpType, type PowerUpUse } from "@/types"
import { toast } from "sonner"
import type { Match } from "@/types"

const ICONS: Record<PowerUpType, typeof Clock> = {
  late_change: Clock,
  double_points: Zap,
  spy: Eye,
  wildcard: Shield,
}

const ALL_TYPES: PowerUpType[] = ["late_change", "double_points", "spy", "wildcard"]

interface Member {
  user_id: string
  profiles: { full_name: string | null; nickname: string | null; avatar_url: string | null } | null
}

const WILDCARD_DISABLED_PHASES = ["semifinals", "third_place", "final"]
const WILDCARD_LIMITED_PHASES = ["round_of_32", "round_of_16", "quarterfinals"]

interface Props {
  open: boolean
  onClose: () => void
  match: Match
  pronoId: string
  coinsInProno: number
  myPowerUps: PowerUpUse[]
  members: Member[]
  userId: string
  wildcardsByPhase: Record<string, number>
  onSuccess: () => void
}

export function PowerUpModal({ open, onClose, match, pronoId, coinsInProno, myPowerUps, members, userId, wildcardsByPhase, onSuccess }: Props) {
  const [selected, setSelected] = useState<PowerUpType | null>(null)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeTypes = new Set(myPowerUps.map(p => p.type))
  const otherMembers = members.filter(m => m.user_id !== userId)

  function handleClose() {
    if (isPending) return
    setSelected(null)
    setTargetUserId(null)
    onClose()
  }

  const wildcardDesc = match.phase === "groups"
    ? "Si tu predicción falla, igual ganas 5 puntos."
    : "Si tu predicción falla, igual ganas 10 puntos."

  function wildcardBlockReason(): string | null {
    const phase = match.phase
    if (WILDCARD_DISABLED_PHASES.includes(phase)) return "No disponible en esta fase del torneo."
    if (WILDCARD_LIMITED_PHASES.includes(phase) && (wildcardsByPhase[phase] ?? 0) >= 1) return "Ya usaste el Comodín en esta fase (máx. 1 por ronda)."
    return null
  }

  function isDisabled(type: PowerUpType) {
    if (activeTypes.has(type)) return true
    if (coinsInProno < POWER_UP_COSTS[type]) return true
    if (type === "late_change" && activeTypes.has("spy")) return true
    if (type === "wildcard" && wildcardBlockReason() !== null) return true
    return false
  }

  function handleSelect(type: PowerUpType) {
    if (isDisabled(type)) return
    setSelected(prev => prev === type ? null : type)
    if (type !== "spy") setTargetUserId(null)
  }

  function handleConfirm() {
    if (!selected) return
    if (selected === "spy" && !targetUserId) return

    startTransition(async () => {
      const res = await activatePowerUp({
        pronoId,
        matchId: match.id,
        type: selected,
        targetUserId: targetUserId ?? undefined,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`${POWER_UP_LABELS[selected]} activado`)
        onSuccess()
        handleClose()
      }
    })
  }

  const canConfirm =
    selected !== null &&
    !isDisabled(selected) &&
    (selected !== "spy" || targetUserId !== null)

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-sm w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-sm font-bold">
            ⚡ Power-ups · {match.home_team} vs {match.away_team}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-1">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-black text-primary text-xl">{coinsInProno}</span>
          <span className="text-xs text-muted-foreground">monedas</span>
        </div>

        <div className="space-y-2">
          {ALL_TYPES.map(type => {
            const Icon = ICONS[type]
            const cost = POWER_UP_COSTS[type]
            const isActive = activeTypes.has(type)
            const canAfford = coinsInProno >= cost
            const isSelected = selected === type
            const blockedBySpy = type === "late_change" && activeTypes.has("spy")
            const blockedWildcard = type === "wildcard" ? wildcardBlockReason() : null
            const disabled = isDisabled(type)

            return (
              <div key={type}>
                <button
                  onClick={() => handleSelect(type)}
                  disabled={disabled || isPending}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all",
                    isActive && "border-primary/30 bg-primary/5 cursor-default",
                    (blockedBySpy || blockedWildcard) && "opacity-40 cursor-not-allowed border-border",
                    !disabled && !isSelected && "border-border hover:border-primary/30",
                    !disabled && isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                    !isActive && !blockedBySpy && !blockedWildcard && !canAfford && "opacity-40 cursor-not-allowed border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {isActive
                        ? <Check className="h-4 w-4 text-primary" />
                        : <Icon className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{POWER_UP_LABELS[type]}</span>
                        <Badge
                          variant={isActive ? "default" : canAfford ? "outline" : "secondary"}
                          className="shrink-0 text-xs font-bold"
                        >
                          {isActive ? "Activo" : `${cost} 🪙`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {blockedBySpy ? "Ya incluido en el Espía activo." : blockedWildcard ?? (type === "wildcard" ? wildcardDesc : POWER_UP_DESCRIPTIONS[type])}
                      </p>
                    </div>
                  </div>
                </button>

                {isSelected && type === "spy" && (
                  <div className="mt-1 ml-3 mr-1 rounded-xl border border-primary/20 bg-muted/30 p-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground px-1">Elige a quién espiar:</p>
                    {otherMembers.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1 py-1">No hay otros miembros.</p>
                    )}
                    {otherMembers.map(m => {
                      const name = m.profiles?.nickname
                        ? `@${m.profiles.nickname}`
                        : (m.profiles?.full_name ?? "Usuario")
                      const initials = (m.profiles?.full_name ?? m.profiles?.nickname ?? "?")
                        .split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                      const isTargeted = targetUserId === m.user_id
                      return (
                        <button
                          key={m.user_id}
                          onClick={e => { e.stopPropagation(); setTargetUserId(isTargeted ? null : m.user_id) }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left",
                            isTargeted ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1">{name}</span>
                          {isTargeted && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!canConfirm || isPending}
          className="w-full rounded-xl mt-1"
        >
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : selected && canConfirm
              ? `Activar ${POWER_UP_LABELS[selected]} · ${POWER_UP_COSTS[selected]} 🪙`
              : "Elige un power-up"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
