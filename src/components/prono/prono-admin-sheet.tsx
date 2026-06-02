"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Settings, UserX, Trash2, Users, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, ShieldCheck, ShieldOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { updatePronoSettings, removeMember, deleteProno, toggleMemberActive, toggleCoAdmin } from "@/app/actions/pronos"

interface Member {
  user_id: string
  is_active: boolean
  role: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface Props {
  pronoId: string
  inviteCode: string
  initialName: string
  initialDescription: string
  initialMaxMembers: number
  members: Member[]
  ownerId: string
  currentUserId: string
}

export function PronoAdminSheet({
  pronoId,
  inviteCode,
  initialName,
  initialDescription,
  initialMaxMembers,
  members,
  ownerId,
  currentUserId,
}: Props) {
  const isFounder = currentUserId === ownerId
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [maxMembers, setMaxMembers] = useState(initialMaxMembers)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [promotingId, setPromotingId] = useState<string | null>(null)

  function handleSaveSettings() {
    if (!name.trim()) { toast.error("El nombre no puede estar vacío"); return }
    if (maxMembers < members.length) { toast.error(`Hay ${members.length} miembros, el máximo no puede ser menor`); return }
    startTransition(async () => {
      const res = await updatePronoSettings({ pronoId, name, description, maxMembers })
      if (res.error) { toast.error(res.error); return }
      toast.success("Configuración guardada")
      router.refresh()
    })
  }

  function handleToggleCoAdmin(userId: string, currentlyAdmin: boolean, memberName: string) {
    setPromotingId(userId)
    startTransition(async () => {
      const res = await toggleCoAdmin({ pronoId, userId, makeAdmin: !currentlyAdmin })
      setPromotingId(null)
      if (res.error) { toast.error(res.error); return }
      toast.success(`${memberName} ${!currentlyAdmin ? "es ahora co-admin" : "ya no es co-admin"}`)
      router.refresh()
    })
  }

  function handleToggleActive(userId: string, currentlyActive: boolean, memberName: string) {
    setTogglingId(userId)
    startTransition(async () => {
      const res = await toggleMemberActive({ pronoId, userId, isActive: !currentlyActive })
      setTogglingId(null)
      if (res.error) { toast.error(res.error); return }
      toast.success(`${memberName} ${!currentlyActive ? "activado" : "desactivado"}`)
      router.refresh()
    })
  }

  function handleRemoveMember(userId: string, memberName: string) {
    setRemovingId(userId)
    startTransition(async () => {
      const res = await removeMember({ pronoId, userId })
      setRemovingId(null)
      if (res.error) { toast.error(res.error); return }
      toast.success(`${memberName} fue removido`)
      router.refresh()
    })
  }

  function handleDeleteProno() {
    startTransition(async () => {
      const res = await deleteProno({ pronoId })
      if (res.error) { toast.error(res.error); return }
      toast.success("Prono eliminado")
      setOpen(false)
      router.push("/pronos")
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors",
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        "h-8 px-2.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}>
        <Settings className="h-4 w-4" /> Administrar
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>Administrar prono</SheetTitle>
        </SheetHeader>

        <div className="space-y-8 px-6 pb-8 pt-6">
          {/* Settings */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Configuración</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nombre</label>
                <Input value={name} onChange={e => setName(e.target.value)} maxLength={60} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Máximo de miembros</p>
                  <p className="text-xs text-muted-foreground">Actualmente hay {members.length}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMaxMembers(v => Math.max(members.length, v - 1))}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold">{maxMembers}</span>
                  <button
                    onClick={() => setMaxMembers(v => Math.min(100, v + 1))}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <Button onClick={handleSaveSettings} disabled={isPending} className="w-full rounded-full">
              Guardar cambios
            </Button>
          </section>

          <Separator />

          {/* Members */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Miembros ({members.length})
            </h3>
            <div className="space-y-1">
              {members.map(m => {
                const name = m.profiles?.full_name ?? "Usuario"
                const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                const isFounderMember = m.user_id === ownerId
                const isCoAdmin = m.role === "admin"
                const isMe = m.user_id === currentUserId
                return (
                  <div key={m.user_id} className={cn("flex items-center gap-3 py-2 px-1", !m.is_active && "opacity-50")}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                      <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                    </Avatar>
                    <span className="flex-1 text-sm font-medium truncate">
                      {name}
                      {isMe && <span className="text-xs text-primary font-normal ml-1">(vos)</span>}
                      {isFounderMember && !isMe && <span className="text-xs text-primary font-normal ml-1">· fundador</span>}
                      {isCoAdmin && !isFounderMember && <span className="text-xs text-amber-500 font-normal ml-1">· co-admin</span>}
                      {!m.is_active && <span className="text-xs text-red-500 font-normal ml-1">· desactivado</span>}
                    </span>
                    {!isMe && !isFounderMember && (
                      <div className="flex items-center gap-1">
                        {isFounder && (
                          <button
                            onClick={() => handleToggleCoAdmin(m.user_id, isCoAdmin, name)}
                            disabled={isPending && promotingId === m.user_id}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors disabled:opacity-40",
                              isCoAdmin
                                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                            title={isCoAdmin ? "Quitar co-admin" : "Hacer co-admin"}
                          >
                            {isCoAdmin
                              ? <ShieldCheck className="h-4 w-4" />
                              : <ShieldOff className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(m.user_id, m.is_active, name)}
                          disabled={isPending && togglingId === m.user_id}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors disabled:opacity-40",
                            m.is_active
                              ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                          title={m.is_active ? "Desactivar" : "Activar"}
                        >
                          {m.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(m.user_id, name)}
                          disabled={isPending && removingId === m.user_id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                          title="Eliminar del prono"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Danger zone — only founder */}
          {isFounder && <Separator />}
          {isFounder && <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-red-500">Zona de peligro</h3>
            {!confirmDelete ? (
              <Button
                variant="outline"
                className="w-full rounded-full border-red-500/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 gap-2"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" /> Eliminar prono
              </Button>
            ) : (
              <div className="space-y-2 p-4 rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/20">
                <p className="text-sm font-semibold text-red-600">¿Estás seguro? Esta acción no se puede deshacer.</p>
                <p className="text-xs text-red-500/80">Se eliminarán todos los datos del prono.</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-full"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white gap-1"
                    onClick={handleDeleteProno}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Sí, eliminar
                  </Button>
                </div>
              </div>
            )}
          </section>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
