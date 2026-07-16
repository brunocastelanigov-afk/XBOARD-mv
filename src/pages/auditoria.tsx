import { useEffect, useMemo, useState } from "react"
import { Eye, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { Skeleton } from "@/components/atoms/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/atoms/table"
import { FilterBar } from "@/components/composites/filter-bar"
import { LeadsTabBar } from "@/components/composites/leads-tab-bar"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { fetchLeadAudit, fetchLeadAuditSummary } from "@/lib/dashboard-queries"
import type { AuditStatusFilters, LeadAuditSummaryRow } from "@/lib/dashboard-types"
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format"

const defaultStatusFilters: AuditStatusFilters = {
  purchase: "all",
  ic: "all",
  contact: "all",
}

function statusVariant(value: boolean) {
  return value
    ? "border-primary/40 bg-primary/10 text-primary"
    : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
}

function aggregateSummary(rows: LeadAuditSummaryRow[]) {
  const totals = rows.reduce(
    (acc, row) => ({
      leads: acc.leads + Number(row.leads ?? 0),
      contact: acc.contact + Number(row.with_contact ?? 0),
      ic: acc.ic + Number(row.with_ic ?? 0),
      purchase: acc.purchase + Number(row.with_purchase ?? 0),
    }),
    { leads: 0, contact: 0, ic: 0, purchase: 0 }
  )

  return {
    ...totals,
    contactRate: totals.leads ? totals.contact / totals.leads : 0,
    icRate: totals.leads ? totals.ic / totals.leads : 0,
    purchaseRate: totals.leads ? totals.purchase / totals.leads : 0,
  }
}

function statusButtonLabel(label: string, value: "all" | "yes" | "no") {
  if (value === "yes") return `${label}: Sim`
  if (value === "no") return `${label}: Não`
  return `${label}: Todos`
}

function nextStatus(value: "all" | "yes" | "no") {
  if (value === "all") return "yes"
  if (value === "yes") return "no"
  return "all"
}

const PAGE_SIZE = 100

export function AuditoriaPage() {
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput, 300)
  const [statusFilters, setStatusFilters] = useState(defaultStatusFilters)
  const [page, setPage] = useState(0)
  const { filters } = useDashboardFilters()
  const navigate = useNavigate()
  const { data, error, loading } = useDashboardQuery(
    (signal) =>
      Promise.all([
        fetchLeadAudit(filters, statusFilters, search, page, PAGE_SIZE, signal),
        fetchLeadAuditSummary(filters, signal),
      ]),
    [filters, statusFilters, search, page]
  )

  useEffect(() => {
    setPage(0)
  }, [filters, statusFilters, search])

  const rows = data?.[0]?.rows ?? []
  const hasMore = data?.[0]?.hasMore ?? false
  const total = data?.[0]?.total ?? 0
  const summary = useMemo(() => aggregateSummary(data?.[1] ?? []), [data])

  function leadUrl(leadId: string) {
    const params = new URLSearchParams()
    if (filters.funnelId) params.set("funnel_id", filters.funnelId)
    if (filters.country) params.set("country", filters.country)
    if (filters.funnelVariant) params.set("funnel_variant", filters.funnelVariant)
    return `/lead/${encodeURIComponent(leadId)}?${params.toString()}`
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <LeadsTabBar defaultValue="auditoria" />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                placeholder="Buscar por lead, email ou telefone..."
                className="pl-9"
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setStatusFilters((current) => ({
                    ...current,
                    purchase: nextStatus(current.purchase),
                  }))
                }
              >
                {statusButtonLabel("Comprou", statusFilters.purchase)}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setStatusFilters((current) => ({
                    ...current,
                    ic: nextStatus(current.ic),
                  }))
                }
              >
                {statusButtonLabel("IC", statusFilters.ic)}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setStatusFilters((current) => ({
                    ...current,
                    contact: nextStatus(current.contact),
                  }))
                }
              >
                {statusButtonLabel("Contato", statusFilters.contact)}
              </Button>
            </div>
          </div>
          <FilterBar showSearch={false} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Badge variant="outline" className="justify-between rounded-md border-border bg-card px-3 py-2">
            Leads <span>{loading ? <Skeleton className="h-4 w-8" /> : formatNumber(summary.leads)}</span>
          </Badge>
          <Badge variant="outline" className="justify-between rounded-md border-border bg-card px-3 py-2">
            Contato <span>{loading ? <Skeleton className="h-4 w-8" /> : formatPercent(summary.contactRate)}</span>
          </Badge>
          <Badge variant="outline" className="justify-between rounded-md border-border bg-card px-3 py-2">
            IC <span>{loading ? <Skeleton className="h-4 w-8" /> : formatPercent(summary.icRate)}</span>
          </Badge>
          <Badge variant="outline" className="justify-between rounded-md border-border bg-card px-3 py-2">
            Compra <span>{loading ? <Skeleton className="h-4 w-8" /> : formatPercent(summary.purchaseRate)}</span>
          </Badge>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 p-4">
            <h3 className="font-heading text-sm font-medium text-foreground">
              Auditoria de Leads
            </h3>
            <Badge variant="outline" className="border-border bg-background text-muted-foreground">
              {loading ? "..." : `${formatNumber(total)} no total`}
            </Badge>
          </div>
          {error && (
            <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              Não foi possível carregar auditoria.
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>IC</TableHead>
                  <TableHead>Compra</TableHead>
                  <TableHead>Último evento</TableHead>
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }, (_, rowIndex) => (
                    <TableRow key={rowIndex} style={{ opacity: 1 - rowIndex * 0.08 }}>
                      <TableCell>
                        <Skeleton className="mb-1.5 h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell>
                        <Skeleton className="mb-1.5 h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-4" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Nenhum dado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((lead) => (
                    <TableRow key={`${lead.funnel_id}-${lead.country}-${lead.funnel_variant}-${lead.lead_id}`} className="group hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium">{lead.lead_name || lead.lead_id}</div>
                        <div className="text-xs text-muted-foreground">{lead.lead_email || lead.lead_phone || lead.lead_id}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(lead.last_seen_at)}</TableCell>
                      <TableCell className="text-sm">
                        <div>{lead.funnel_id}</div>
                        <div className="text-xs text-muted-foreground">{lead.country} / {lead.funnel_variant ?? "sem variante"}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.utm_source || "-"} / {lead.utm_campaign || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariant(lead.has_contact)}>{lead.has_contact ? "Contato" : "Não contato"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariant(lead.has_ic)}>{lead.has_ic ? "IC" : "Não IC"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariant(lead.has_purchase)}>{lead.has_purchase ? "Comprou" : "Não comprou"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead.last_event_type || "-"}</TableCell>
                      <TableCell className="text-right">
                        <button
                          className="p-2 text-muted-foreground opacity-0 transition-colors hover:text-primary group-hover:opacity-100"
                          title="Ver Timeline do Lead"
                          onClick={() => navigate(leadUrl(lead.lead_id))}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border p-3">
            <span className="text-xs text-muted-foreground">
              Página {page + 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
