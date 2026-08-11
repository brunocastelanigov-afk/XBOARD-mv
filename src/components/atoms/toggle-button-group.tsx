import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ToggleButtonGroupOption {
  label: string
  value: string
  icon?: LucideIcon
}

export interface ToggleButtonGroupProps {
  options: ToggleButtonGroupOption[]
  value: string
  onChange: (value: string) => void
  columns?: 1 | 2
  className?: string
}

function ToggleButtonGroup({
  options,
  value,
  onChange,
  columns = 1,
  className,
}: ToggleButtonGroupProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 ? "grid-cols-2" : "grid-cols-1",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon ? <Icon className="size-4" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
ToggleButtonGroup.displayName = "ToggleButtonGroup"

export { ToggleButtonGroup }
