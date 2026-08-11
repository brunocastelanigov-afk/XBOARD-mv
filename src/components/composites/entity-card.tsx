import * as React from "react"
import { ChevronDown, type LucideIcon } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Badge, type badgeVariants } from "@/components/atoms/badge"
import { Button, type buttonVariants } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

export interface EntityCardBadge {
  label: string
  variant?: VariantProps<typeof badgeVariants>["variant"]
  className?: string
}

export interface EntityCardAction {
  icon: LucideIcon
  onClick: () => void
  variant?: VariantProps<typeof buttonVariants>["variant"]
  label?: string
}

export interface EntityCardProps {
  title: string
  icon?: LucideIcon
  badges?: EntityCardBadge[]
  metadata?: string[]
  actions?: EntityCardAction[]
  expandable?: boolean
  defaultExpanded?: boolean
  children?: React.ReactNode
  className?: string
  titleClassName?: string
}

export function EntityCard({
  title,
  icon: Icon,
  badges,
  metadata,
  actions,
  expandable,
  defaultExpanded,
  children,
  className,
  titleClassName,
}: EntityCardProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded ?? false)
  const showContent = children && (!expandable || expanded)

  return (
    <Card className={cn("rounded-lg border-border shadow-sm", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-2">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
              <Icon className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className={cn("text-sm font-medium", titleClassName)}>{title}</CardTitle>
              {badges?.map((badge, index) => (
                <Badge key={index} variant={badge.variant} className={badge.className}>
                  {badge.label}
                </Badge>
              ))}
            </div>
            {metadata && metadata.length > 0 && (
              <p className="text-xs text-muted-foreground">{metadata.join(" · ")}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions?.map((action, index) => (
            <Button
              key={index}
              type="button"
              size="icon-sm"
              variant={action.variant ?? "ghost"}
              onClick={action.onClick}
              aria-label={action.label}
            >
              <action.icon />
            </Button>
          ))}
          {expandable && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? "Recolher" : "Expandir"}
            >
              <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
            </Button>
          )}
        </div>
      </CardHeader>
      {showContent && <CardContent className="p-4 pt-0">{children}</CardContent>}
    </Card>
  )
}
