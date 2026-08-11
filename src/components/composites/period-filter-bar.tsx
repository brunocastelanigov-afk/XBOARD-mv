import { RefreshCw } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

export type PeriodFilterRange = "all" | "7d" | "30d" | "90d" | "custom"

export interface PeriodFilterBarProps {
  emailFilter: string
  onEmailFilterChange: (value: string) => void
  range: PeriodFilterRange
  onRangeChange: (range: PeriodFilterRange) => void
  onRefresh?: () => void
  className?: string
}

const rangeOptions: { label: string; value: PeriodFilterRange }[] = [
  { label: "Tudo", value: "all" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "Personalizado", value: "custom" },
]

export function PeriodFilterBar({
  emailFilter,
  onEmailFilterChange,
  range,
  onRangeChange,
  onRefresh,
  className,
}: PeriodFilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <Input
        value={emailFilter}
        placeholder="Filtrar por e-mail..."
        className="w-full lg:w-56"
        onChange={(event) => onEmailFilterChange(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        {rangeOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={option.value === range ? "default" : "outline"}
            onClick={() => onRangeChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Atualizar"
            onClick={onRefresh}
          >
            <RefreshCw className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
