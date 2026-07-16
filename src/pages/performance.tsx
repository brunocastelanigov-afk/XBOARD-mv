import { LeadsTabBar } from "@/components/composites/leads-tab-bar"
import { MetricCard } from "@/components/composites/metric-card"
import { ChartCard } from "@/components/composites/chart-card"
import { FilterBar } from "@/components/composites/filter-bar"
import { Badge } from "@/components/atoms/badge"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import {
  fetchCampaignPerformance,
  fetchDevicePerformance,
  fetchPerformance,
} from "@/lib/dashboard-queries"
import type {
  CampaignPerformanceRow,
  DevicePerformanceRow,
  PerformanceRow,
} from "@/lib/dashboard-types"
import { formatDuration, formatNumber, formatPercent } from "@/lib/format"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const chartColors = [
  "oklch(var(--primary))",
  "oklch(var(--accent))",
  "oklch(var(--chart-3))",
  "oklch(var(--destructive))",
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

function buildFunnelData(rows: PerformanceRow[]) {
  return [
    { name: "Acessos", value: sum(rows, "visitors") },
    { name: "Respostas", value: sum(rows, "responses_started") },
    { name: "Leads", value: sum(rows, "leads") },
    { name: "Conclusões", value: sum(rows, "conclusions") },
  ]
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
      conversion: row.visitors ? (row.conclusions / row.visitors) * 100 : 0,
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
    percentage: total ? (value / total) * 100 : 0,
  }))
}

export function PerformancePage() {
  const { filters } = useDashboardFilters()
  const { data, error, loading } = useDashboardQuery(
    (signal) =>
      Promise.all([
        fetchPerformance(filters, signal),
        fetchCampaignPerformance(filters, signal),
        fetchDevicePerformance(filters, signal),
      ]),
    [filters]
  )
  const performanceRows = data?.[0] ?? []
  const campaignRows = data?.[1] ?? []
  const deviceRows = data?.[2] ?? []
  const trafficData = buildTrafficData(performanceRows)
  const funnelData = buildFunnelData(performanceRows)
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
      <LeadsTabBar defaultValue="performance" />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
        <FilterBar showSearch={false} />

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível carregar performance.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <MetricCard title="Score Geral" value={loading ? "..." : formatPercent(weightedAverage(performanceRows, "score"))} />
          <MetricCard title="Acessos" value={loading ? "..." : formatNumber(sum(performanceRows, "visitors"))} />
          <MetricCard title="Respostas Iniciadas" value={loading ? "..." : formatNumber(sum(performanceRows, "responses_started"))} />
          <MetricCard title="Conclusões" value={loading ? "..." : formatNumber(sum(performanceRows, "conclusions"))} />
          <MetricCard title="Tempo Médio" value={loading ? "..." : formatDuration(averageSeconds)} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Tráfego e Conversão">
            <div className="mt-4 h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="oklch(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "oklch(var(--card))", borderColor: "oklch(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="visitors" stroke="oklch(var(--muted-foreground))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="leads" stroke="oklch(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conclusions" stroke="oklch(var(--chart-3))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Funil de Retenção">
            <div className="mt-4 h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="oklch(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="oklch(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "oklch(var(--muted))" }} contentStyle={{ backgroundColor: "oklch(var(--card))", borderColor: "oklch(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="oklch(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Ranking de Campanhas">
              <div className="mt-4 space-y-4">
                {campaigns.length === 0 ? (
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
                  <Tooltip contentStyle={{ backgroundColor: "oklch(var(--card))", borderColor: "oklch(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
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
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
