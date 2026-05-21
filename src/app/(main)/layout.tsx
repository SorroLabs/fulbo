import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/layout/navbar"
import type { Profile } from "@/types"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    profile = data
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-primary">fulbo.co</span> — Predicciones de fútbol · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
