import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchFilterOptions } from "@/lib/dashboard-queries"
import type { DashboardFilterOption, DashboardFilters } from "@/lib/dashboard-types"
import { lastDaysRange } from "@/lib/format"

interface DashboardFiltersContextValue {
  filters: DashboardFilters
  options: DashboardFilterOption[]
  loadingOptions: boolean
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>
}

const DashboardFiltersContext = createContext<DashboardFiltersContextValue | null>(
  null
)

const initialFilters: DashboardFilters = {
  funnelId: null,
  country: null,
  funnelVariant: null,
  ...lastDaysRange(7),
}

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters)
  const {
    data: options,
    loading: loadingOptions,
  } = useDashboardQuery(fetchFilterOptions, [])

  const value = useMemo<DashboardFiltersContextValue>(
    () => ({
      filters,
      options: options ?? [],
      loadingOptions,
      setFilters,
    }),
    [filters, loadingOptions, options]
  )

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  )
}

export function useDashboardFilters() {
  const context = useContext(DashboardFiltersContext)

  if (!context) {
    throw new Error(
      "useDashboardFilters must be used inside DashboardFiltersProvider."
    )
  }

  return context
}
