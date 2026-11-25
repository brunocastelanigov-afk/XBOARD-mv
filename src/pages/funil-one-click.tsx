import { useEffect, useMemo, useState } from "react"
import { PauseCircle, RefreshCw, Save, Zap } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { Skeleton } from "@/components/atoms/skeleton"
import { DataGrid } from "@/components/composites/data-grid"
import { FilterBar } from "@/components/composites/filter-bar"
import { MetricCard } from "@/components/composites/metric-card"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchOcFunnelConfig, fetchOcFunnelSummary, updateOcFunnelPercent } from "@/lib/dashboard-queries"
import type { OcFunnelProduct, OcFunnelSummaryRow } from "@/lib/dashboard-types"
import { ratePercent, twoProportionTest } from "@/lib/ab-stats"
import { formatCurrency, formatNumber } from "@/lib/format"

const PRODUCTS: Array<{ key: OcFunnelProduct; label: string }> = [
  { key: "trinca", label: "Trinca" },
  { key: "pink", label: "Pink" },
]

// Abaixo disso por braço o resultado é ruído: mostramos o aviso em vez de uma conclusão.
const MIN_SAMPLE_PER_ARM = 200

function num(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

function pct(value: number) {
  return `${value.toFixed(2)}%`
}

function verdict(
  padrao: OcFunnelSummaryRow | undefined,
  oneClick: OcFunnelSummaryRow | undefined,
  pick: (row: OcFunnelSummaryRow) => number
) {
  const nA = num(padrao?.obrigado_views)
  const nB = num(oneClick?.obrigado_views)
  if (!padrao || !oneClick || !nA || !nB) return "Sem dados nos dois braços ainda."
  const { diffPoints, pValue } = twoProportionTest(pick(padrao), nA, pick(oneClick), nB)
  const diff = `${diffPoints >= 0 ? "+" : ""}${diffPoints.toFixed(2)} p.p. (one-click vs padrão)`
  if (nA < MIN_SAMPLE_PER_ARM || nB < MIN_SAMPLE_PER_ARM) {
    return `${diff}. Amostra pequena (mínimo ${MIN_SAMPLE_PER_ARM} por braço): ainda não dá para concluir.`
  }
  if (pValue === null) return `${diff}. Sem base para o teste estatístico.`
  const significant = pValue < 0.05
  const label = significant ? (diffPoints > 0 ? "One-click melhor" : "One-click pior") : "Sem diferença significativa"
  return `${diff}. ${label} (p = ${pValue.toFixed(3)}).`
}

export function FunilOneClickPage() {
  const { filters } = useDashboardFilters()
  const [percentDraft, setPercentDraft] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const configQuery = useDashboardQuery(fetchOcFunnelConfig, [])
  const summaryQuery = useDashboardQuery((signal) => fetchOcFunnelSummary(filters, signal), [filters])

  const config = configQuery.data?.[0]
  useEffect(() => {
    if (config) setPercentDraft(num(config.one_click_percent))
  }, [config])

  const rows = summaryQuery.data ?? []
  const byKey = useMemo(() => {
    const map = new Map<string, OcFunnelSummaryRow>()
    for (const row of rows) map.set(`${row.product}:${row.arm}`, row)
    return map
  }, [rows])

  const inTest = rows.filter((row) => row.arm !== "sem_token")
  const totalInTest = inTest.reduce((total, row) => total + num(row.obrigado_views), 0)
  const totalSemToken = rows.filter((row) => row.arm === "sem_token").reduce((t, row) => t + num(row.obrigado_views), 0)
  const totalRevenue = inTest.reduce((t, row) => t + num(row.upsell_revenue_cents) + num(row.downsell_revenue_cents), 0)
  const oneClickInTest = inTest.filter((row) => row.arm === "one_click").reduce((t, row) => t + num(row.obrigado_views), 0)

  const percentValid = Number.isInteger(percentDraft) && percentDraft >= 0 && percentDraft <= 100
  const canSave = percentValid && !saving && percentDraft !== num(config?.one_click_percent)

  async function savePercent(value: number) {
    setSaving(true)
    setSaveError(null)
    setSaveMessage(null)
    try {
      await updateOcFunnelPercent(value)
      setPercentDraft(value)
      setSaveMessage(value === 0 ? "One-click pausado: todo mundo no fluxo padrão." : `Split salvo: ${value}% no one-click.`)
      configQuery.refetch()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar o split.")
    } finally {
      setSaving(false)
    }
  }

  const activeFromLabel = config
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(
        new Date(config.active_from)
      )
    : null

  return (
    <div className="flex min-w-0 flex-col animate-in fade-in duration-500">
      <div className="flex min-w-0 flex-col gap-4 p-3 sm:gap-6 sm:p-4 md:p-6">
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
            Não foi possível carregar o funil one-click.
          </div>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <MetricCard
            title="Compradores com token"
            hint="Chegaram ao obrigado com token (cartão) e entraram no teste, nos dois braços."
            value={summaryQuery.loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totalInTest)}
          />
          <MetricCard
            title="No one-click"
            hint="Parcela dos compradores com token que caiu no braço one-click."
            value={
              summaryQuery.loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                `${formatNumber(oneClickInTest)} (${pct(ratePercent(oneClickInTest, totalInTest))})`
              )
            }
          />
          <MetricCard
            title="Sem token (fora do teste)"
            hint="Acessos ao obrigado sem token (Pix, boleto, link de e-mail). Ficam no padrão e não entram em nenhuma taxa."
            value={summaryQuery.loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totalSemToken)}
          />
          <MetricCard
            title="Receita de upsell/downsell"
            hint="Compras de cartão (a partir de R$ 10) atribuídas aos compradores do teste."
            value={summaryQuery.loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(totalRevenue)}
          />
        </div>

        <Card className="min-w-0 rounded-lg border-border shadow-sm">
          <CardHeader className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Split do one-click
            </CardTitle>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <Button variant="outline" size="sm" onClick={configQuery.refetch}>
                <RefreshCw />
                Recarregar
              </Button>
              <Button variant="outline" size="sm" onClick={() => savePercent(0)} disabled={saving || num(config?.one_click_percent) === 0}>
                <PauseCircle />
                Pausar (0%)
              </Button>
              <Button size="sm" onClick={() => savePercent(percentDraft)} disabled={!canSave}>
                <Save />
                Salvar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Só entra no teste quem chega ao obrigado <strong className="text-foreground">com token</strong>. Sem token o
              comprador segue o fluxo padrão. Em 0% todo mundo fica no padrão (o rastreio continua medindo o baseline).
              {activeFromLabel ? ` Vigência desde ${activeFromLabel}.` : ""}
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

            <label className="grid max-w-[220px] gap-1 text-sm">
              <span className="font-medium text-foreground">% no one-click (0–100)</span>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={percentDraft}
                onChange={(event) => {
                  setSaveError(null)
                  setSaveMessage(null)
                  setPercentDraft(Number(event.currentTarget.value))
                }}
              />
              {!percentValid && <span className="text-xs text-destructive">Use um inteiro entre 0 e 100.</span>}
            </label>
          </CardContent>
        </Card>

        {PRODUCTS.map(({ key, label }) => {
          const padrao = byKey.get(`${key}:padrao`)
          const oneClick = byKey.get(`${key}:one_click`)
          const gridRows = [
            { name: "Padrão", row: padrao },
            { name: "One-click", row: oneClick },
          ]
          return (
            <Card key={key} className="min-w-0 rounded-lg border-border shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <DataGrid
                  className="min-w-0 max-w-full"
                  columns={[
                    "Braço",
                    "Obrigado (token)",
                    "Viram upsell",
                    "Cliques upsell",
                    "Compras upsell",
                    "Taxa upsell",
                    "Viram downsell",
                    "Compras downsell",
                    "Taxa downsell",
                    "Receita",
                  ]}
                  data={gridRows.map(({ name, row }) => {
                    const base = num(row?.obrigado_views)
                    return [
                      name,
                      formatNumber(base),
                      formatNumber(num(row?.upsell_views)),
                      formatNumber(num(row?.upsell_clicks)),
                      formatNumber(num(row?.upsell_purchases)),
                      pct(ratePercent(num(row?.upsell_purchases), base)),
                      formatNumber(num(row?.downsell_views)),
                      formatNumber(num(row?.downsell_purchases)),
                      pct(ratePercent(num(row?.downsell_purchases), base)),
                      formatCurrency(num(row?.upsell_revenue_cents) + num(row?.downsell_revenue_cents)),
                    ]
                  })}
                />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Upsell:</strong> {verdict(padrao, oneClick, (r) => num(r.upsell_purchases))}
                  </p>
                  <p>
                    <strong className="text-foreground">Downsell:</strong>{" "}
                    {verdict(padrao, oneClick, (r) => num(r.downsell_purchases))}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}

        <p className="text-xs text-muted-foreground">
          Taxa = compras ÷ compradores com token no braço. Compra de upsell/downsell: cartão, a partir de R$ 10, atribuída
          ao último clique do mesmo e-mail nos 30 min anteriores (o webhook da Lastlink chega ~2 min depois). Pix e boleto
          não geram token e ficam fora do teste, então o resultado vale para quem paga no cartão.
        </p>
      </div>
    </div>
  )
}
