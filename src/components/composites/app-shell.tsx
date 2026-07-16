import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/atoms/button"
import { Outlet } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  title?: string
}

export function AppShell({ children, title = "Dashboard", className, ...props }: AppShellProps) {
  const { user, signOut } = useAuth()
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "TT"

  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)} {...props}>
      {/* Top App Bar */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="font-heading font-bold text-lg text-primary">{title}</div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Construtor</a>
          <a href="#" className="hover:text-foreground transition-colors">Fluxo</a>
          <a href="#" className="hover:text-foreground transition-colors">Design</a>
          <a href="#" className="text-foreground border-b-2 border-primary py-4">Leads</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => void signOut()}>Sair</Button>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {initials}
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto overflow-x-hidden">
        {children || <Outlet />}
      </main>
    </div>
  )
}
