"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Coins } from "lucide-react"
import { approveParticipant, rejectParticipant, grantCoins } from "@/app/actions/admin"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

interface Props {
  participants: any[]
  adminId: string
}

export function ParticipantsAdmin({ participants: initial, adminId }: Props) {
  const [participants, setParticipants] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [coinsInput, setCoinsInput] = useState<Record<string, string>>({})

  function handleApprove(id: string, userId: string) {
    startTransition(async () => {
      const coins = parseInt(coinsInput[id] ?? "100")
      const res = await approveParticipant({ participantId: id, userId, coins, adminId })
      if (res.error) toast.error(res.error)
      else {
        toast.success(`Inscripción aprobada. +${coins} monedas asignadas.`)
        setParticipants(p => p.filter(x => x.id !== id))
      }
    })
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const res = await rejectParticipant({ participantId: id, adminId })
      if (res.error) toast.error(res.error)
      else {
        toast.success("Inscripción rechazada.")
        setParticipants(p => p.filter(x => x.id !== id))
      }
    })
  }

  if (!participants.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay inscripciones pendientes.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {participants.map(p => {
        const initials = p.profiles?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"
        return (
          <Card key={p.id}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-4 flex-wrap">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.profiles?.avatar_url} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{p.profiles?.full_name ?? "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">{p.profiles?.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{p.competitions?.name}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-primary" />
                    <Input
                      type="number"
                      value={coinsInput[p.id] ?? "100"}
                      onChange={e => setCoinsInput(v => ({ ...v, [p.id]: e.target.value }))}
                      className="w-20 h-8 rounded-lg text-sm text-center"
                      min={0}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(p.id, p.user_id)}
                    disabled={isPending}
                    className="rounded-full gap-1.5 h-8"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(p.id)}
                    disabled={isPending}
                    className="rounded-full gap-1.5 h-8"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
