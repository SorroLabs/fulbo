import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"
import type { Profile } from "@/types"

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const { setup } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) redirect("/login")

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black mb-1">{setup ? "Configurá tu perfil" : "Ajustes"}</h1>
        <p className="text-muted-foreground">Tu identidad en fulbo.co</p>
      </div>
      <ProfileForm profile={profile as Profile} isSetup={!!setup} />
    </div>
  )
}
