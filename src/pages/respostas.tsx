import { useMemo, useState } from "react"
import { LeadsTabBar } from "@/components/composites/leads-tab-bar"
import { FilterBar } from "@/components/composites/filter-bar"
import { DataGrid } from "@/components/composites/data-grid"
import { Badge } from "@/components/atoms/badge"
import { CircularProgress } from "@/components/ui/circular-progress"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchLeadResponses, fetchStepResults } from "@/lib/dashboard-queries"
import type { LeadResponseRow, LeadStepCell, StepResultRow } from "@/lib/dashboard-types"
import { formatDateTime, formatPercent } from "@/lib/format"

function leadLabel(lead: LeadResponseRow) {
  return lead.lead_name || lead.lead_email || lead.lead_phone || lead.lead_id
}

function StepAnswerBadge({ cell }: { cell?: LeadStepCell }) {
  if (!cell) {
    return <span className="text-muted-foreground">-</span>
  }

  const answer = cell.answer_label || cell.answer_value;
  const showClicked = cell.button_clicked;

  if (!answer && !showClicked) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {answer && (
        <Badge variant="outline">
          {answer}
        </Badge>
      )}
      {showClicked && (
        <Badge
          variant="secondary"
          className="bg-primary/15 text-primary hover:bg-primary/20"
        >
          clicked
        </Badge>
      )}
    </div>
  )
}

function uniqueSteps(rows: StepResultRow[]) {
  const byStep = new Map<number, StepResultRow>()

  for (const row of rows) {
    const current = byStep.get(row.step_number)
    if (!current || Number(row.entries ?? 0) > Number(current.entries ?? 0)) {
      byStep.set(row.step_number, row)
    }
  }

  return Array.from(byStep.values()).sort((a, b) => a.step_number - b.step_number)
}

export function RespostasPage() {
  const [search, setSearch] = useState("")
  const { filters } = useDashboardFilters()
  const {
    data,
    error,
    loading,
  } = useDashboardQuery(
    () =>
      Promise.all([
        fetchLeadResponses(filters),
        fetchStepResults(filters),
      ]),
    [filters]
  )

  const leads = data?.[0] ?? []
  const steps = useMemo(() => uniqueSteps(data?.[1] ?? []), [data])
  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return leads

    return leads.filter((lead) =>
      [
        lead.lead_id,
        lead.lead_name,
        lead.lead_email,
        lead.lead_phone,
        lead.utm_source,
        lead.utm_campaign,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [leads, search])

  const columns: React.ReactNode[] = [
    "Lead",
    "Data",
    ...steps.map((step) => {
      const pct = (step.passage_rate ?? 0) * 100
      return (
        <div className="flex items-center gap-2">
          <CircularProgress value={pct} size={32} strokeWidth={2.5} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-foreground">
              {step.step_number}. {step.step_name ?? "Etapa"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatPercent(step.passage_rate)}
            </span>
          </div>
        </div>
      )
    }),
  ]

  const rows = filteredLeads.map((lead) => [
    <div className="min-w-[140px]">
      <div className="font-medium text-foreground">{leadLabel(lead)}</div>
      <div className="text-xs text-muted-foreground">{lead.lead_id}</div>
    </div>,
    <div className="text-sm text-muted-foreground">
      {formatDateTime(lead.last_seen_at ?? lead.lead_date)}
    </div>,
    ...steps.map((step) => (
      <StepAnswerBadge
        key={`${lead.lead_id}-${step.step_number}`}
        cell={lead.steps?.[String(step.step_number)]}
      />
    )),
  ])

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <LeadsTabBar defaultValue="respostas" />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 rounded-md border border-border bg-card p-1">
              <button className="rounded-sm bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors">Etapas</button>
            </div>
          </div>
          <FilterBar search={search} onSearchChange={setSearch} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/20 p-4">
            <h3 className="font-heading text-sm font-medium text-foreground">
              Respostas do Funil
            </h3>
          </div>
          {error && (
            <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              Não foi possível carregar respostas.
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <DataGrid
              columns={columns}
              data={loading ? [] : rows}
              className="h-full rounded-none border-0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
