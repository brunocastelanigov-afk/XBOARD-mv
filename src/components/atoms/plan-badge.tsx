import { Crown, Zap, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"

export type Plan = "elite" | "trinca"

export interface PlanBadgeProps {
  plan: Plan
  className?: string
}

const planConfig: Record<
  Plan,
  { label: string; icon: LucideIcon; variant: "accent" | "secondary" }
> = {
  elite: { label: "ELITE", icon: Crown, variant: "accent" },
  trinca: { label: "TRINCA", icon: Zap, variant: "secondary" },
}

function PlanBadge({ plan, className }: PlanBadgeProps) {
  const config = planConfig[plan]
  if (!config) return null

  const { label, icon: Icon, variant } = config
  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  )
}
PlanBadge.displayName = "PlanBadge"

export { PlanBadge }
