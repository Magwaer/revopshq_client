"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { Code, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      themes={["light", "dark", "matrix"]}
    >
      {children}
    </NextThemesProvider>
  )
}

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

/** RevOps HQ lockup; the white asset until hydration, since the default theme is dark. */
export function BrandLogo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const tone = mounted && resolvedTheme === "light" ? "black" : "white"

  return (
    <Image
      key={tone}
      src={`/brand/revops-hq-lockup-${tone}.svg`}
      alt="RevOps HQ"
      width={523}
      height={97}
      priority
      className={className}
    />
  )
}

const THEMES = [
  { id: "light", label: "Light mode", icon: Sun },
  { id: "dark", label: "Dark mode", icon: Moon },
  { id: "matrix", label: "Matrix theme", icon: Code },
] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  if (!useMounted()) return null

  return (
    <div className={cn("flex items-center gap-1 rounded-md border border-border", className)}>
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          aria-label={label}
          className={cn(
            "p-2 transition-colors first:rounded-l-md last:rounded-r-md",
            theme === id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
