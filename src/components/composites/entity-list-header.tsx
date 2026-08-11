import type { LucideIcon } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

import { Button, type buttonVariants } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

export interface EntityListHeaderAction {
  label: string
  icon?: LucideIcon
  variant?: VariantProps<typeof buttonVariants>["variant"]
  onClick?: () => void
}

interface EntityListHeaderProps {
  title: string
  count?: number | string
  actions?: EntityListHeaderAction[]
  className?: string
}

export function EntityListHeader({ title, count, actions, className }: EntityListHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {count !== undefined && <span className="text-sm text-muted-foreground">({count})</span>}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action, index) => (
            <Button key={index} type="button" variant={action.variant ?? "default"} onClick={action.onClick}>
              {action.icon && <action.icon />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
