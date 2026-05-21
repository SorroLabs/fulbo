import { createClient } from "@/lib/supabase/server"
import { CreatePronoForm } from "@/components/prono/create-prono-form"

export default async function NuevaProno() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, name, season, status")
    .in("status", ["upcoming", "active"])
    .order("start_date")

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-1">Nuevo prono</h1>
        <p className="text-muted-foreground">Creá tu grupo y compartilo con tus amigos</p>
      </div>
      <CreatePronoForm competitions={competitions ?? []} userId={user?.id ?? ""} />
    </div>
  )
}
