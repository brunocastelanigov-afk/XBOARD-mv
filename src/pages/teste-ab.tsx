import { useEffect, useMemo, useState } from "react"
import { FlaskConical, RefreshCw, Save } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { Skeleton } from "@/components/atoms/skeleton"
import { DataGrid } from "@/components/composites/data-grid"
import { FilterBar } from "@/components/composites/filter-bar"
import { MetricCard } from "@/components/composites/metric-card"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import {
  fetchUpsell2AbTestConfig,
  fetchUpsell2AbTestSummary,
  updateUpsell2AbTestVariant,
} from "@/lib/dashboard-queries"
import type { AbTestConfigRow } from "@/lib/dashboard-types"
import { formatCurrency, formatNumber } from "@/lib/format"

type EditableVariant = Pick<
  AbTestConfigRow,
  "test_key" | "variant_key" | "variant_label" | "price_cents" | "checkout_url" | "split_percent"
>

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function TesteAbPage() {
  const { filters } = useDashboardFilters()
  const [drafts, setDrafts] = useState<EditableVariant[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const configQuery = useDashboardQuery(fetchUpsell2AbTestConfig, [])
  const summaryQuery = useDashboardQuery(
    (signal) => fetchUpsell2AbTestSummary(filters, signal),
    [filters]
  )

  useEffect(() => {
    if (!configQuery.data?.length) return
    setDrafts(
      configQuery.data.map((row) => ({
        test_key: row.test_key,
        variant_key: row.variant_key,
        variant_label: row.variant_label,
        price_cents: row.price_cents,
        checkout_url: row.checkout_url,
        split_percent: row.split_percent,
      }))
    )
  }, [configQuery.data])

  const summaryRows = summaryQuery.data ?? []
  const totalViews = sum(summaryRows.map((row) => Number(row.views ?? 0)))
  const totalClicks = sum(summaryRows.map((row) => Number(row.clicks ?? 0)))
  const totalPurchases = sum(summaryRows.map((row) => Number(row.purchases_count ?? 0)))
  const totalNetRevenue = sum(summaryRows.map((row) => Number(row.net_revenue_cents ?? 0)))
  const totalSplit = sum(drafts.map((row) => Number(row.split_percent || 0)))
  const canSave = drafts.length > 0 && totalSplit === 100 && !saving

  const activeFromLabel = useMemo(() => {
    const first = configQuery.data?.[0]
    if (!first) return null
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(first.active_from))
  }, [configQuery.data])

  function updateDraft(index: number, patch: Partial<EditableVariant>) {
    setSaveError(null)
    setSaveMessage(null)
    setDrafts((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  async function saveConfig() {
    if (!canSave) return
    setSaving(true)
    setSaveError(null)
    setSaveMessage(null)

    try {
      await Promise.all(drafts.map(updateUpsell2AbTestVariant))
      setSaveMessage("Configuração salva.")
      configQuery.refetch()
      summaryQuery.refetch()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar o teste A/B.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
        <FilterBar
          showSearch={false}
          onReload={() => {
            configQuery.refetch()
            summaryQuery.refetch()
          }}
          isRefetching={configQuery.isRefetching || summaryQuery.isRefetching}
        />

        {(configQuery.error || summaryQuery.error) && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível carregar o teste A/B do Upsell-02.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            title="Visualizações"
            value={summaryQuery.loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totalViews)}
          />
          <MetricCard
            title="Clicks"
            hint="Cliques no CTA principal do Upsell-02."
            value={summaryQuery.loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totalClicks)}
          />
          <MetricCard
            title="Vendas"
            value={summaryQuery.loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totalPurchases)}
          />
          <MetricCard
            title="Receita líquida"
            value={summaryQuery.loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(totalNetRevenue)}
          />
          <MetricCard
            title="Vigência"
            value={configQuery.loading ? <Skeleton className="h-7 w-24" /> : activeFromLabel ?? "-"}
          />
        </div>

        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-primary" />
              Configuração do Upsell-02
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={configQuery.refetch}>
                <RefreshCw />
                Recarregar
              </Button>
              <Button size="sm" onClick={saveConfig} disabled={!canSave}>
                <Save />
                Salvar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Split atual: <strong className={totalSplit === 100 ? "text-foreground" : "text-destructive"}>{totalSplit}%</strong>
            </div>

            {saveError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </div>
            )}
            {saveMessage && (
              <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                {saveMessage}
              </div>
            )}

            <div className="grid gap-3">
              {drafts.map((row, index) => (
                <div key={row.variant_key} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[120px_120px_1fr]">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">{row.variant_label}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={row.split_percent}
                      onChange={(event) => updateDraft(index, { split_percent: Number(event.currentTarget.value) })}
                    />
                  </label>
                  <div className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">Preço</span>
                    <div className="flex h-8 items-center rounded-lg border border-border px-2.5 text-muted-foreground">
                      {formatCurrency(row.price_cents)}
                    </div>
                  </div>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-foreground">Checkout</span>
                    <Input
                      value={row.checkout_url}
                      onChange={(event) => updateDraft(index, { checkout_url: event.currentTarget.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <DataGrid
          columns={["Variante", "Split", "Views", "Clicks", "CTR", "Vendas", "Bruto", "Estornos", "Líquido", "Conversão"]}
          data={summaryRows.map((row) => [
            row.variant_label,
            `${row.split_percent}%`,
            formatNumber(row.views),
            formatNumber(row.clicks),
            `${Number(row.click_rate ?? 0).toFixed(2)}%`,
            formatNumber(row.purchases_count),
            formatCurrency(row.purchases_gross_cents),
            formatCurrency(row.refunds_cents + row.chargebacks_cents),
            formatCurrency(row.net_revenue_cents),
            `${Number(row.conversion_rate ?? 0).toFixed(2)}%`,
          ])}
        />
      </div>
    </div>
  )
}
