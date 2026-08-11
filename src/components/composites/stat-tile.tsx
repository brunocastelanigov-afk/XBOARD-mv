import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { MetricCard } from "@/components/composites/metric-card"
import { cn } from "@/lib/utils"

export type StatTileTone = "blue" | "green" | "red" | "amber" | "purple"

interface StatTileProps {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  tone: StatTileTone
  description?: string
  className?: string
}

const toneClassMap: Record<StatTileTone, string> = {
  blue: "bg-blue-500/10 text-blue-500",
  green: "bg-green-500/10 text-green-500",
  red: "bg-red-500/10 text-red-500",
  amber: "bg-amber-500/10 text-amber-500",
  purple: "bg-purple-500/10 text-purple-500",
}

export function StatTile({ label, value, icon: Icon, tone, description, className }: StatTileProps) {
  return (
    <MetricCard
      className={cn(
        "gap-1 [&_[data-slot=card-header]]:p-2 [&_[data-slot=card-header]]:pb-1 [&_[data-slot=card-content]]:p-2 [&_[data-slot=card-content]]:pt-0",
        className
      )}
      title={label}
      value={
        <div>
          <div className="flex items-center gap-1.5">
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", toneClassMap[tone])}>
              <Icon className="size-3" />
            </span>
            <span>{value}</span>
          </div>
          {description && (
            <p className="pt-1.5 text-xs font-normal text-muted-foreground">{description}</p>
          )}
        </div>
      }
    />
  )
}
