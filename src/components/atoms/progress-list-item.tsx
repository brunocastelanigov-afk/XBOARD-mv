import * as React from "react"

import { Progress } from "@/components/atoms/progress"
import { cn } from "@/lib/utils"

export interface ProgressListItemProps extends React.ComponentProps<"div"> {
  label: string
  value: string | number
  percent: number
  color?: "primary" | "success" | "destructive" | "accent"
}

const colorClassMap: Record<
  NonNullable<ProgressListItemProps["color"]>,
  string
> = {
  primary:
    "[&_[data-slot=progress-indicator]]:bg-primary",
  success:
    "[&_[data-slot=progress-indicator]]:bg-success",
  destructive:
    "[&_[data-slot=progress-indicator]]:bg-destructive",
  accent:
    "[&_[data-slot=progress-indicator]]:bg-accent",
}

function ProgressListItem({
  label,
  value,
  percent,
  color = "primary",
  className,
  ...props
}: ProgressListItemProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {value}
        </span>
      </div>
      <Progress value={percent} className={cn(colorClassMap[color])} />
    </div>
  )
}
ProgressListItem.displayName = "ProgressListItem"

export { ProgressListItem }
