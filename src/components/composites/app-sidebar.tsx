import { MessageSquare, BarChart2, Activity, ShieldCheck, DollarSign, LogOut, ImageIcon, ListChecks, Settings, UserPlus, Dumbbell, ClipboardList, Users, GraduationCap } from "lucide-react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

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

// Menu items — `group` drives the role gate. Story 15.8 hides Dashboard,
// Conquistas and Relatórios because their Epic 14 backend was cut.
const items = [
  {
    title: "ROI de Campanhas",
    url: "/roi-campanhas",
    icon: DollarSign,
    group: "traffic" as const,
  },
  {
    title: "Respostas",
    url: "/respostas",
    icon: MessageSquare,
    group: "traffic" as const,
  },
  {
    title: "Resultados",
    url: "/resultados",
    icon: BarChart2,
    group: "traffic" as const,
  },
  {
    title: "Performance Geral",
    url: "/performance",
    icon: Activity,
    group: "traffic" as const,
  },
  {
    title: "Auditoria de Leads",
    url: "/auditoria",
    icon: ShieldCheck,
    group: "traffic" as const,
  },
  {
    title: "Usuários",
    url: "/crm/usuarios",
    icon: Users,
    group: "crm" as const,
  },
  {
    title: "Protocolos",
    url: "/crm/protocolos",
    icon: ClipboardList,
    group: "crm" as const,
  },
  {
    title: "Exercícios",
    url: "/crm/exercicios",
    icon: Dumbbell,
    group: "crm" as const,
  },
  {
    title: "Avaliação",
    url: "/crm/avaliacao",
    icon: GraduationCap,
    group: "crm" as const,
  },
  {
    title: "Banners",
    url: "/crm/banners",
    icon: ImageIcon,
    group: "crm" as const,
  },
  {
    title: "Regras",
    url: "/crm/regras",
    icon: ListChecks,
    group: "crm" as const,
  },
  {
    title: "Liberar usuário",
    url: "/crm/liberar-usuario",
    icon: UserPlus,
    group: "crm" as const,
  },
  {
    title: "Configurações",
    url: "/crm/configuracoes",
    icon: Settings,
    group: "crm" as const,
  },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isCrmRole, signOut } = useAuth()

  const visibleItems = items.filter((item) =>
    isCrmRole ? item.group === "crm" : item.group === "traffic"
  )

  const handleLogout = async () => {
    await signOut()
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
              {visibleItems.map((item) => (
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
