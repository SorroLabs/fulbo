"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { joinProno } from "@/app/actions/pronos"
import { toast } from "sonner"

interface Props {
  pronoId: string
  inviteCode: string
  isLoggedIn: boolean
}

export function PronoJoinButton({ pronoId, inviteCode, isLoggedIn }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleJoin() {
    if (!isLoggedIn) {
      router.push(`/login?next=/pronos/${inviteCode}`)
      return
    }
    startTransition(async () => {
      const res = await joinProno({ pronoId })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("¡Te uniste al prono!")
        router.refresh()
      }
    })
  }

  return (
    <Button
      onClick={handleJoin}
      disabled={isPending}
      className="rounded-full gap-2"
    >
      <UserPlus className="h-4 w-4" />
      {isLoggedIn ? "Unirme al prono" : "Iniciar sesión para unirme"}
    </Button>
  )
}
