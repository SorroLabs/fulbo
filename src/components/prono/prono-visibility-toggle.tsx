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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        "hover:opacity-70 cursor-pointer",
        isPublic
          ? "bg-secondary text-secondary-foreground border-transparent"
          : "border-border text-foreground bg-transparent",
        isPending && "opacity-40 cursor-not-allowed"
      )}
    >
      {isPublic
        ? <><Globe className="h-3 w-3" /> Público</>
        : <><Lock className="h-3 w-3" /> Privado</>}
    </button>
  )
}
