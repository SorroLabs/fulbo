"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode } from "lucide-react"
import { joinPronoByCode } from "@/app/actions/pronos"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function JoinPronoDialog() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleJoin() {
    startTransition(async () => {
      const res = await joinPronoByCode({ code })
      if (res.error) toast.error(res.error)
      else {
        toast.success("¡Te uniste al prono!")
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2")}>
        <QrCode className="h-4 w-4" /> Unirme con código
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unirme con código de invitación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Código de invitación</Label>
            <Input
              placeholder="Ej: ABC12345"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="rounded-xl font-mono text-lg tracking-widest text-center h-12"
              maxLength={8}
            />
          </div>
          <Button
            onClick={handleJoin}
            disabled={isPending || code.length < 4}
            className="w-full rounded-xl"
          >
            {isPending ? "Uniéndome..." : "Unirme al prono"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
