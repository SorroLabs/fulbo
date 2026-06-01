import type { Metadata, Viewport } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeByTime } from "@/components/theme-by-time"
import { Toaster } from "@/components/ui/sonner"

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
})

const BASE_URL = "https://fulbo.io"

export const metadata: Metadata = {
  title: "fulbo.io — Predicciones de fútbol",
  description: "La forma más divertida de vivir los torneos de fútbol. Crea tu prono, invita a tus amigos y compite en rankings globales.",
  manifest: "/manifest.json",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "fulbo.io — Predicciones de fútbol",
    description: "Predice los resultados del Mundial 2026, compite con tus amigos y sube al ranking global.",
    url: BASE_URL,
    siteName: "fulbo.io",
    type: "website",
    locale: "es_419",
  },
  twitter: {
    card: "summary_large_image",
    title: "fulbo.io — Predicciones de fútbol",
    description: "Predice los resultados del Mundial 2026, compite con tus amigos y sube al ranking global.",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <ThemeByTime />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
