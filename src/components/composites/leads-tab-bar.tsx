import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

export function LeadsTabBar({ defaultValue = "respostas", className }: { defaultValue?: string, className?: string }) {
  const navigate = useNavigate()
  
  return (
    <Tabs 
      defaultValue={defaultValue} 
      className={cn("w-full border-b border-border", className)}
      onValueChange={(val) => navigate(`/${val}`)}
    >
      <TabsList className="bg-transparent h-12 w-full justify-start p-0 rounded-none overflow-x-auto flex-nowrap">
        <TabsTrigger 
          value="respostas" 
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4"
        >
          Respostas
        </TabsTrigger>
        <TabsTrigger 
          value="resultados" 
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4"
        >
          Resultados de Respostas
        </TabsTrigger>
        <TabsTrigger 
          value="performance" 
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4"
        >
          Performance Geral
        </TabsTrigger>
        <TabsTrigger 
          value="auditoria" 
          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4"
        >
          Auditoria de Leads
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
