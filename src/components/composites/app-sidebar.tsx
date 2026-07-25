import { MessageSquare, BarChart2, Activity, ShieldCheck, DollarSign, LogOut } from "lucide-react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/atoms/sidebar"

// Menu items
const items = [
  {
    title: "Respostas",
    url: "/respostas",
    icon: MessageSquare,
  },
  {
    title: "Resultados",
    url: "/resultados",
    icon: BarChart2,
  },
  {
    title: "Performance Geral",
    url: "/performance",
    icon: Activity,
  },
  {
    title: "Auditoria de Leads",
    url: "/auditoria",
    icon: ShieldCheck,
  },
  {
    title: "ROI de Campanhas",
    url: "/roi-campanhas",
    icon: DollarSign,
  },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border py-4 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-start overflow-hidden px-1">
              <div className="w-8 h-8 flex-shrink-0 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                TT
              </div>
              <span className="ml-3 truncate font-bold group-data-[collapsible=icon]:hidden">
                Trinca
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    render={<Link to={item.url} />} 
                    isActive={location.pathname.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
