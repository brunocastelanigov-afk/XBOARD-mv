import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"

interface CategoryPillFilterProps {
  options: string[]
  active: string
  onChange: (value: string) => void
  className?: string
}

export function CategoryPillFilter({ options, active, onChange, className }: CategoryPillFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Badge variant={option === active ? "default" : "outline"} className="cursor-pointer select-none">
            {option}
          </Badge>
        </button>
      ))}
    </div>
  )
}
