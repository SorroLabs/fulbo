"use client"

import { useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Share2, Copy, Check } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

interface Props {
  inviteCode: string
  appUrl: string
  pronoId: string
}

export function PronoInvite({ inviteCode, appUrl, pronoId }: Props) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = `${appUrl}/pronos/${pronoId}?code=${inviteCode}`

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    toast.success("Link copiado")
    setTimeout(() => setCopied(false), 2000)
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode)
    toast.success("Código copiado")
  }

  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "rounded-full gap-2 shrink-0")}>
        <Share2 className="h-4 w-4" /> Invitar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a el prono</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {/* QR */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={inviteUrl} size={180} />
            </div>
          </div>

          {/* Code */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Código de invitación</p>
            <button
              onClick={copyCode}
              className="font-mono font-black text-3xl tracking-widest text-primary hover:text-primary/80 transition-colors"
            >
              {inviteCode}
            </button>
          </div>

          {/* Link */}
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="rounded-xl text-xs" />
            <Button onClick={copyLink} size="icon" variant="outline" className="shrink-0 rounded-xl">
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
