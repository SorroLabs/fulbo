"use client"

import { useState, useTransition } from "react"
import { Globe, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { togglePronoVisibility } from "@/app/actions/pronos"
import { toast } from "sonner"

interface Props {
  pronoId: string
  isPublic: boolean
}

export function PronoVisibilityToggle({ pronoId, isPublic: initial }: Props) {
  const [isPublic, setIsPublic] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !isPublic
    setIsPublic(next)
    startTransition(async () => {
      const res = await togglePronoVisibility({ pronoId, isPublic: next })
      if (res.error) {
        setIsPublic(!next)
        toast.error(res.error)
      } else {
        toast.success(next ? "Prono ahora público" : "Prono ahora privado")
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={isPublic ? "Hacer privado" : "Hacer público"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
        isPublic
          ? "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          : "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10",
        isPending && "opacity-50 cursor-not-allowed"
      )}
    >
      {isPublic
        ? <><Globe className="h-3.5 w-3.5" /> Público</>
        : <><Lock className="h-3.5 w-3.5" /> Privado</>}
    </button>
  )
}
