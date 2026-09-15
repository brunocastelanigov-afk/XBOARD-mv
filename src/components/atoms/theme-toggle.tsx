import { Sparkles, Sun } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { Button } from "@/components/atoms/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isElite = theme === "elite"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-1.5 transition-all text-xs font-sans h-8 px-2.5 rounded-lg border-border/80 hover:border-primary/50"
            aria-label={isElite ? "Mudar para tema Padrão" : "Mudar para tema Elite"}
          />
        }
      >
        {isElite ? (
          <>
            <Sparkles className="size-3.5 text-primary animate-pulse" />
            <span className="font-semibold text-foreground">Tema Elite</span>
          </>
        ) : (
          <>
            <Sun className="size-3.5 text-muted-foreground" />
            <span className="text-foreground">Tema Padrão</span>
          </>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        {isElite ? "Ativar tema Padrão (Claro)" : "Ativar tema Elite (Dark Navy)"}
      </TooltipContent>
    </Tooltip>
  )

}
