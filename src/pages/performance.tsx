
import { MetricCard } from "@/components/composites/metric-card"
import { ChartCard } from "@/components/composites/chart-card"
import { FilterBar } from "@/components/composites/filter-bar"
import { Badge } from "@/components/atoms/badge"
import { Skeleton } from "@/components/atoms/skeleton"
import { Progress } from "@/components/atoms/progress"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import {
  fetchCampaignPerformance,
  fetchDevicePerformance,
  fetchPerformance,
  fetchStepResults,
} from "@/lib/dashboard-queries"
import type {
  CampaignPerformanceRow,
  DevicePerformanceRow,
  PerformanceRow,
  StepResultRow,
} from "@/lib/dashboard-types"
import { formatDuration, formatNumber, formatPercent, isTestVariant } from "@/lib/format"
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const trafficLegendLabels: Record<string, string> = {
  visitors: "Acessos",
  leads: "Leads",
  conclusions: "Conclusões",
}

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function sum(rows: PerformanceRow[], field: keyof PerformanceRow) {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0)
}

function weightedAverage(rows: PerformanceRow[], valueField: keyof PerformanceRow) {
  const totalVisitors = sum(rows, "visitors")
  if (!totalVisitors) return 0

  return rows.reduce(
    (total, row) => total + Number(row[valueField] ?? 0) * Number(row.visitors ?? 0),
    0
  ) / totalVisitors
}

function buildTrafficData(rows: PerformanceRow[]) {
  const byDate = new Map<string, { date: string; visitors: number; leads: number; conclusions: number }>()

  for (const row of rows) {
    const current = byDate.get(row.event_date) ?? {
      date: row.event_date,
      visitors: 0,
      leads: 0,
      conclusions: 0,
    }

    current.visitors += Number(row.visitors ?? 0)
    current.leads += Number(row.leads ?? 0)
    current.conclusions += Number(row.conclusions ?? 0)
    byDate.set(row.event_date, current)
  }

  return Array.from(byDate.values())
}

function aggregateSteps(rows: StepResultRow[]) {
  const byStep = new Map<number, { name: string; entries: number }>()
  let maxEntries = 0;

  for (const row of rows) {
    const current = byStep.get(row.step_number) ?? {
      name: row.step_name ?? `Step ${row.step_number}`,
      entries: 0,
    }
    current.entries += Number(row.entries ?? 0)
    byStep.set(row.step_number, current)
  }

  const result = Array.from(byStep.entries()).map(([number, data]) => ({
    number,
    name: data.name,
    entries: data.entries
  })).sort((a, b) => a.number - b.number)

  if (result.length > 0) {
     maxEntries = result[0].entries;
  }

  return result.map(r => ({
    ...r,
    percentage: maxEntries > 0 ? (r.entries / maxEntries) * 100 : 0
  }))
}

function aggregateCampaigns(rows: CampaignPerformanceRow[]) {
  const byCampaign = new Map<string, CampaignPerformanceRow>()

  for (const row of rows) {
    const key = [row.utm_source, row.utm_campaign].filter(Boolean).join(" / ") || "Sem UTM"
    const current = byCampaign.get(key)

    if (!current) {
      byCampaign.set(key, { ...row })
      continue
    }

    current.visitors += Number(row.visitors ?? 0)
    current.leads += Number(row.leads ?? 0)
    current.conclusions += Number(row.conclusions ?? 0)
    current.responses_started += Number(row.responses_started ?? 0)
  }

  return Array.from(byCampaign.entries())
    .map(([name, row]) => ({
      name,
      leads: row.leads,
      conversion: row.visitors ? row.conclusions / row.visitors : 0,
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8)
}

function aggregateDevices(rows: DevicePerformanceRow[]) {
  const total = rows.reduce((sumValue, row) => sumValue + Number(row.visitors ?? 0), 0)
  const byDevice = new Map<string, number>()

  for (const row of rows) {
    const key = row.device_type || "unknown"
    byDevice.set(key, (byDevice.get(key) ?? 0) + Number(row.visitors ?? 0))
  }

  return Array.from(byDevice.entries()).map(([name, value]) => ({
    name,
    value,
    percentage: total ? value / total : 0,
  }))
}

export function PerformancePage() {
  const { filters } = useDashboardFilters()
  const { data, error, loading, isRefetching, refetch } = useDashboardQuery(
    (signal) =>
      Promise.all([
        fetchPerformance(filters, signal),
        fetchCampaignPerformance(filters, signal),
        fetchDevicePerformance(filters, signal),
        fetchStepResults(filters, signal),
      ]),
    [filters]
  )
  const performanceRows = (data?.[0] ?? []).filter((row) => !isTestVariant(row.funnel_variant))
  const campaignRows = (data?.[1] ?? []).filter((row) => !isTestVariant(row.funnel_variant))
  const deviceRows = (data?.[2] ?? []).filter((row) => !isTestVariant(row.funnel_variant))
  const stepRows = (data?.[3] ?? []).filter((row) => !isTestVariant(row.funnel_variant))
  const trafficData = buildTrafficData(performanceRows)
  const stepsData = aggregateSteps(stepRows)
  const campaigns = aggregateCampaigns(campaignRows)
  const devices = aggregateDevices(deviceRows)
  const topDevice = devices.sort((a, b) => b.value - a.value)[0]
  const averageSeconds =
    performanceRows.reduce(
      (total, row) =>
        total + Number(row.average_time_seconds ?? 0) * Number(row.visitors ?? 0),
      0
    ) / Math.max(sum(performanceRows, "visitors"), 1)

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
        <FilterBar showSearch={false} onReload={refetch} isRefetching={isRefetching} />

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível carregar performance.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <MetricCard title="Score Geral" value={loading ? <Skeleton className="h-7 w-16" /> : formatPercent(weightedAverage(performanceRows, "score") / 100)} />
          <MetricCard title="Acessos" value={loading ? <Skeleton className="h-7 w-16" /> : formatNumber(sum(performanceRows, "visitors"))} />
          <MetricCard title="Respostas Iniciadas" value={loading ? <Skeleton className="h-7 w-16" /> : formatNumber(sum(performanceRows, "responses_started"))} />
          <MetricCard
            title="Conclusões"
            hint="Leads que iniciaram o checkout (evento checkout_start) — não significa que compraram."
            value={loading ? <Skeleton className="h-7 w-16" /> : formatNumber(sum(performanceRows, "conclusions"))}
          />
          <MetricCard title="Tempo Médio" value={loading ? <Skeleton className="h-7 w-16" /> : formatDuration(averageSeconds)} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Tráfego e Conversão">
            <div className="mt-4 h-[250px] w-full">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trafficData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: "var(--muted-foreground)" }}>{trafficLegendLabels[value] ?? value}</span>
                      )}
                    />
                    <Line type="monotone" dataKey="visitors" name="visitors" stroke="var(--muted-foreground)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="leads" name="leads" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="conclusions" name="conclusions" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Funil de Retenção">
            <div className="mt-4 flex h-[250px] w-full flex-col gap-4 overflow-y-auto pr-2">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : stepsData.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma etapa registrada.</div>
              ) : (
                stepsData.map((step) => (
                  <div key={step.number} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{step.number}. {step.name}</span>
                      <span className="text-muted-foreground">{formatNumber(step.entries)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={step.percentage} className="h-2 flex-1" />
                      <span className="w-12 text-right text-xs font-medium text-primary">
                        {formatPercent(step.percentage / 100)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Ranking de Campanhas">
              <div className="mt-4 space-y-4">
                {loading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-3"
                      style={{ opacity: 1 - index * 0.15 }}
                    >
                      <Skeleton className="h-4 w-32" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : campaigns.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma campanha encontrada.
                  </div>
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.name} className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-3">
                      <div className="text-sm font-medium">{campaign.name}</div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">{formatNumber(campaign.leads)} leads</span>
                        <Badge variant="outline" className="border-primary/50 text-primary">{formatPercent(campaign.conversion)}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Dispositivos">
            <div className="relative mt-4 flex h-[220px] w-full items-center justify-center">
              {loading ? (
                <Skeleton className="h-[160px] w-[160px] rounded-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={devices}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {devices.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {!loading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {formatPercent(topDevice?.percentage)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {topDevice?.name ?? "Sem dados"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
