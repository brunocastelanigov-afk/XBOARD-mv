import { MetricCard } from "@/components/composites/metric-card"
import { FilterBar } from "@/components/composites/filter-bar"
import { DataGrid } from "@/components/composites/data-grid"
import { Skeleton } from "@/components/atoms/skeleton"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchCampaignRoi } from "@/lib/dashboard-queries"
import type { CampaignRoiRow } from "@/lib/dashboard-types"
import { formatCurrency, formatNumber } from "@/lib/format"

function sum(rows: CampaignRoiRow[], field: keyof CampaignRoiRow) {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0)
}

const trafficSourceLabels: Record<string, string> = {
  facebook: "Facebook / Meta",
  tiktok: "TikTok",
  youtube: "YouTube",
  google: "Google",
  organic: "Orgânico",
  unknown: "Outras fontes",
}

function getTrafficSourceId(row: CampaignRoiRow) {
  return row.traffic_source_id ?? "unknown"
}

function labelTrafficSource(value: string) {
  return trafficSourceLabels[value] ?? value
}

function groupRowsByTrafficSource(rows: CampaignRoiRow[]) {
  return rows.reduce<Record<string, CampaignRoiRow[]>>((groups, row) => {
    const source = getTrafficSourceId(row)
    groups[source] = groups[source] ?? []
    groups[source].push(row)
    return groups
  }, {})
}

const columns = [
  "Campanha",
  "Mídia",
  "Vendas Front",
  "Vendas Upsell",
  "Receita Front",
  "Receita Upsell",
  "Estornos",
  "Receita Total",
]

export function CampaignRoiPage() {
  const { filters } = useDashboardFilters()
  const { data, error, loading, isRefetching, refetch } = useDashboardQuery(
    (signal) => fetchCampaignRoi(filters, signal),
    [filters]
  )
  const rows = data ?? []
  const groupedRows = groupRowsByTrafficSource(rows)
  const sourceOrder = Object.keys(groupedRows).sort((a, b) => {
    const totalDelta = sum(groupedRows[b], "total_revenue_cents") - sum(groupedRows[a], "total_revenue_cents")
    return totalDelta || labelTrafficSource(a).localeCompare(labelTrafficSource(b))
  })
  const visibleSourceOrder = filters.trafficSourceId
    ? sourceOrder.filter((source) => source === filters.trafficSourceId)
    : sourceOrder

  function renderGrid(sourceRows: CampaignRoiRow[]) {
    return (
      <DataGrid
        columns={columns}
        data={sourceRows.map((row) => [
          [row.utm_source, row.utm_campaign].filter(Boolean).join(" / ") || "Sem UTM",
          row.utm_medium ?? "-",
          formatNumber(row.front_orders),
          formatNumber(row.upsell_orders),
          formatCurrency(row.front_revenue_cents),
          formatCurrency(row.upsell_revenue_cents),
          formatCurrency(row.reversed_revenue_cents),
          formatCurrency(row.total_revenue_cents),
        ])}
      />
    )
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
        <FilterBar
          showSearch={false}
          showTrafficSource
          onReload={refetch}
          isRefetching={isRefetching}
        />

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível carregar ROI de campanhas.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            title="Receita Total"
            hint="Receita líquida (front + upsell, já descontando estornos)."
            value={loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(sum(rows, "total_revenue_cents"))}
          />
          <MetricCard title="Receita Front" value={loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(sum(rows, "front_revenue_cents"))} />
          <MetricCard title="Receita Upsell" value={loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(sum(rows, "upsell_revenue_cents"))} />
          <MetricCard
            title="Não Atribuída"
            hint="Vendas cujo lead_id/Vtid não bateu com nenhum evento de funil conhecido."
            value={loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(sum(rows, "unmatched_revenue_cents"))}
          />
          <MetricCard
            title="Estornada"
            hint="Total de refunds e chargebacks no período."
            value={loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(sum(rows, "reversed_revenue_cents"))}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" style={{ opacity: 1 - index * 0.15 }} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {visibleSourceOrder.length === 0 ? (
              renderGrid([])
            ) : (
              visibleSourceOrder.map((source) => (
                <section key={source} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-medium text-foreground">
                      {labelTrafficSource(source)}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(sum(groupedRows[source], "total_revenue_cents"))}
                    </span>
                  </div>
                  {renderGrid(groupedRows[source])}
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
