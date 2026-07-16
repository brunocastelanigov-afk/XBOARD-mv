import { useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select"
import { Input } from "@/components/atoms/input"
import { DateRangeCalendar } from "@/components/composites/date-range-calendar"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { cn } from "@/lib/utils"

interface FilterBarProps {
  className?: string
  search?: string
  showSearch?: boolean
  onSearchChange?: (value: string) => void
}

const allValue = "__all__"
const nullValue = "__null__"

export function FilterBar({
  className,
  search = "",
  showSearch = true,
  onSearchChange,
}: FilterBarProps) {
  const { filters, options, setFilters } = useDashboardFilters()
  const funnelOptions = Array.from(new Set(options.map((option) => option.funnel_id)))

  useEffect(() => {
    if (!filters.funnelId && funnelOptions.length > 0) {
      setFilters((current) => ({ ...current, funnelId: funnelOptions[0] }))
    }
  }, [filters.funnelId, funnelOptions, setFilters])

  const countryOptions = Array.from(
    new Set(
      options
        .filter((option) => !filters.funnelId || option.funnel_id === filters.funnelId)
        .map((option) => option.country)
    )
  )
  const variantOptions = Array.from(
    new Set(
      options
        .filter((option) => !filters.funnelId || option.funnel_id === filters.funnelId)
        .filter((option) => !filters.country || option.country === filters.country)
        .map((option) => option.funnel_variant ?? nullValue)
    )
  )

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select
          value={filters.funnelId ?? allValue}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              country: null,
              funnelId: value,
              funnelVariant: null,
            }))
          }
        >
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Funil" />
          </SelectTrigger>
          <SelectContent>
            {funnelOptions.map((funnelId) => (
              <SelectItem key={funnelId} value={funnelId}>{funnelId}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.country ?? allValue}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              country: value === allValue ? null : value,
              funnelVariant: null,
            }))
          }
        >
          <SelectTrigger className="w-full lg:w-[150px]">
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>Todos países</SelectItem>
            {countryOptions.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.funnelVariant ?? allValue}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              funnelVariant: value === allValue ? null : value,
            }))
          }
        >
          <SelectTrigger className="w-full lg:w-[170px]">
            <SelectValue placeholder="Variante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>Todas variantes</SelectItem>
            {variantOptions.map((variant) => (
              <SelectItem key={variant} value={variant}>
                {variant === nullValue ? "Sem variante" : variant}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showSearch && (
          <Input
            value={search}
            placeholder="Buscar lead..."
            className="w-full lg:w-[220px]"
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
        )}
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <DateRangeCalendar
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(range) =>
            setFilters((current) => ({
              ...current,
              ...range,
            }))
          }
        />
      </div>
    </div>
  )
}
