import { CalendarDays } from "lucide-react"
import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { lastDaysRange } from "@/lib/format"
import { cn } from "@/lib/utils"

interface DateRangeCalendarProps {
  dateFrom: string
  dateTo: string
  onChange: (range: { dateFrom: string; dateTo: string }) => void
  className?: string
}

const quickRanges = [
  { label: "24 horas", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
]

export function DateRangeCalendar({
  dateFrom,
  dateTo,
  onChange,
  className,
}: DateRangeCalendarProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Data inicial"
          className="h-9 w-[136px]"
          type="date"
          value={dateFrom}
          onChange={(event) =>
            onChange({ dateFrom: event.target.value, dateTo })
          }
        />
        <Input
          aria-label="Data final"
          className="h-9 w-[136px]"
          type="date"
          value={dateTo}
          onChange={(event) =>
            onChange({ dateFrom, dateTo: event.target.value })
          }
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {quickRanges.map((range) => (
          <Button
            key={range.days}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onChange(lastDaysRange(range.days))}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
