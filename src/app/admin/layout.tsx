import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single()
    : { data: null }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Left: back to app */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver al sitio</span>
          </Link>

          {/* Center: admin label */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">Panel de administración</span>
          </div>

          {/* Right: theme toggle + who's logged in */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ThemeToggle />
            {profile?.avatar_url && (
              <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
            )}
            <span className="hidden sm:inline truncate max-w-[140px]">
              {profile?.full_name ?? user?.email}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
