import * as React from "react"
import { cn } from "@/lib/utils"
import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/atoms/sidebar"
import { AppSidebar } from "@/components/composites/app-sidebar"

interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  title?: string
}

export function AppShell({ children, title = "Dashboard", className, ...props }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className={cn("h-svh bg-background flex flex-col flex-1 overflow-hidden", className)} {...props}>
        {/* Header — item de altura fixa fora da área de scroll, não usa mais "sticky".
            (overflow-x-hidden num ancestral de um elemento sticky força overflow-y a virar
            "auto" nesse ancestral, quebrando o sticky relativo à viewport — daí o bug de scroll.) */}
        <div className="shrink-0 z-30 flex items-center gap-2 border-b border-white/10 bg-background/40 backdrop-blur-xl px-4 h-14 shadow-sm">
          <SidebarTrigger />
          <div className="font-heading font-bold text-lg text-primary">{title}</div>
        </div>
        {/* Main Content Area — única região com scroll */}
        <main className="flex-1 w-full mx-auto overflow-y-auto overflow-x-hidden">
          {children || <Outlet />}
        </main>
      </div>
    </SidebarProvider>
  )
}
