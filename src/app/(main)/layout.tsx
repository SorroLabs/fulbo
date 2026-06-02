import { createClient } from "@/lib/supabase/server"
import { Navbar } from "@/components/layout/navbar"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import type { Profile } from "@/types"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  let pushEndpoint: string | null = null
  if (user) {
    const [{ data: profileData }, { data: pushSub }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("push_subscriptions").select("endpoint").eq("user_id", user.id).limit(1).maybeSingle(),
    ])
    profile = profileData
    pushEndpoint = pushSub?.endpoint ?? null
  }

  // Force profile setup if no nickname
  if (user && profile && !profile.nickname) {
    const headersList = await headers()
    const pathname = headersList.get("x-invoke-path") ?? headersList.get("x-pathname") ?? ""
    if (!pathname.startsWith("/settings")) redirect("/settings?setup=1")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} pushEndpoint={pushEndpoint} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-primary">fulbo.io</span> — Predicciones de fútbol · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
