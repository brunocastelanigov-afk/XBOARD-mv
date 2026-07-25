import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchFilterOptions } from "@/lib/dashboard-queries"
import type { DashboardFilterOption, DashboardFilters } from "@/lib/dashboard-types"
import { lastDaysRange } from "@/lib/format"
import { useAuth } from "@/contexts/auth-context"

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
  trafficSourceId: null,
  ...lastDaysRange(7),
}

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const { isTikTokOnlyUser } = useAuth()
  const [filters, setFiltersState] = useState<DashboardFilters>(initialFilters)
  const {
    data: options,
    loading: loadingOptions,
  } = useDashboardQuery((signal) => fetchFilterOptions(signal), [])

  // Story 1.4: usuário tiktok_only nunca pode navegar pra outra fonte de tráfego — a UI já
  // esconde o seletor (ver FilterBar), mas travamos aqui também para não depender só disso
  // (defesa em profundidade no client; a garantia real é a RPC forçando o filtro no servidor).
  const setFilters = useCallback<Dispatch<SetStateAction<DashboardFilters>>>(
    (update) => {
      setFiltersState((current) => {
        const next = typeof update === "function" ? (update as (prev: DashboardFilters) => DashboardFilters)(current) : update
        return isTikTokOnlyUser ? { ...next, trafficSourceId: "tiktok" } : next
      })
    },
    [isTikTokOnlyUser]
  )

  useEffect(() => {
    if (isTikTokOnlyUser) {
      setFiltersState((current) =>
        current.trafficSourceId === "tiktok" ? current : { ...current, trafficSourceId: "tiktok" }
      )
    }
  }, [isTikTokOnlyUser])

  const value = useMemo<DashboardFiltersContextValue>(
    () => ({
      filters,
      options: options ?? [],
      loadingOptions,
      setFilters,
    }),
    [filters, loadingOptions, options, setFilters]
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
