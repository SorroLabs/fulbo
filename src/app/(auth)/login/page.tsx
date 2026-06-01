"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const next = searchParams.get("next") ?? "/dashboard"

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            <span className="text-primary">fulbo</span>
            <span className="text-muted-foreground">.co</span>
          </h1>
          <p className="text-muted-foreground text-sm">Predicciones de fútbol con tus amigos</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl shadow-black/10">
          <h2 className="text-xl font-bold text-center mb-2">Bienvenido</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Ingresá con tu cuenta de Google para empezar a predecir
          </p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">
              Error al iniciar sesión. Intentá de nuevo.
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 text-base font-semibold rounded-xl gap-3"
          >
            <LogIn className="h-5 w-5" />
            Continuar con Google
          </Button>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Al ingresar aceptás nuestros{" "}
            <span className="underline cursor-pointer">términos de uso</span>.
            <br />
            fulbo.io es solo para entretenimiento.
          </p>
        </div>

        {/* Decorative balls */}
        <div className="flex justify-center gap-4 mt-8 text-2xl opacity-30">
          ⚽ 🏆 ⚽
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
