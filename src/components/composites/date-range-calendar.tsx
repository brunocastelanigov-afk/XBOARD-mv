import { CalendarDays } from "lucide-react"
import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { lastDaysRange } from "@/lib/format"
import { cn } from "@/lib/utils"

interface DateRangeCalendarProps {
  dateFrom: string
  dateTo: string
  is24hActive: boolean
  onChange: (range: { dateFrom: string; dateTo: string; is24hActive: boolean }) => void
  className?: string
}

const quickRanges = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
]

// Problema 02: quando "24 horas" está ativo, os campos de calendário deixam de refletir
// datas literais (que confundiam o usuário perto da meia-noite, mostrando "ontem/hoje" sem
// contexto) e passam a mostrar o gap de horário relativo ao momento atual.
export function DateRangeCalendar({
  dateFrom,
  dateTo,
  is24hActive,
  onChange,
  className,
}: DateRangeCalendarProps) {
  function toggleLast24h() {
    if (is24hActive) {
      onChange({ dateFrom, dateTo, is24hActive: false })
      return
    }
    onChange({ ...lastDaysRange(1), is24hActive: true })
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        {is24hActive ? (
          <>
            <Input
              aria-label="Data inicial"
              className="h-9 w-[136px] text-muted-foreground"
              value="Últimas 24h"
              disabled
              readOnly
            />
            <Input
              aria-label="Data final"
              className="h-9 w-[136px] text-muted-foreground"
              value="Até agora"
              disabled
              readOnly
            />
          </>
        ) : (
          <>
            <Input
              aria-label="Data inicial"
              className="h-9 w-[136px]"
              type="date"
              value={dateFrom}
              onChange={(event) =>
                onChange({ dateFrom: event.target.value, dateTo, is24hActive: false })
              }
            />
            <Input
              aria-label="Data final"
              className="h-9 w-[136px]"
              type="date"
              value={dateTo}
              onChange={(event) =>
                onChange({ dateFrom, dateTo: event.target.value, is24hActive: false })
              }
            />
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant={is24hActive ? "default" : "outline"}
          size="xs"
          aria-pressed={is24hActive}
          onClick={toggleLast24h}
        >
          24 horas
        </Button>
        {quickRanges.map((range) => (
          <Button
            key={range.days}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onChange({ ...lastDaysRange(range.days), is24hActive: false })}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
