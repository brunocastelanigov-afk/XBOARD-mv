import { useMemo, useState } from "react"
import { LeadsTabBar } from "@/components/composites/leads-tab-bar"
import { MetricCard } from "@/components/composites/metric-card"
import { Progress } from "@/components/atoms/progress"
import { useDashboardFilters } from "@/contexts/dashboard-filters-context"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchStepResults } from "@/lib/dashboard-queries"
import type { AnswerDistributionItem, StepResultRow } from "@/lib/dashboard-types"
import { formatDuration, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

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

function distributionLabel(item: AnswerDistributionItem) {
  return item.answer_label || item.answer_value || item.label || item.value || "Sem resposta"
}

function distributionCount(item: AnswerDistributionItem) {
  return Number(item.choices ?? item.count ?? item.responses ?? 0)
}

export function ResultadosPage() {
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const { filters } = useDashboardFilters()
  const {
    data: rawSteps,
    error,
    loading,
  } = useDashboardQuery((signal) => fetchStepResults(filters, signal), [filters])
  const steps = useMemo(() => uniqueSteps(rawSteps ?? []), [rawSteps])
  const selectedStep = steps.find((step) => step.step_number === activeStep) ?? steps[0]
  const distribution = selectedStep?.answer_distribution ?? []
  const totalAnswers = distribution.reduce(
    (total, item) => total + distributionCount(item),
    0
  )

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <LeadsTabBar defaultValue="resultados" />

      <div className="flex flex-1 flex-col gap-6 p-4 md:flex-row md:p-6">
        <div className="flex w-full flex-shrink-0 gap-2 overflow-x-auto pb-2 md:w-64 md:flex-col md:overflow-visible md:pb-0">
          <div className="mb-2 hidden text-sm font-medium text-muted-foreground md:block">
            Etapas do Funil
          </div>
          {steps.map((step) => (
            <button
              key={step.step_number}
              onClick={() => setActiveStep(step.step_number)}
              className={cn(
                "whitespace-nowrap rounded-md border px-4 py-3 text-left text-sm transition-colors md:whitespace-normal",
                selectedStep?.step_number === step.step_number
                  ? "border-primary bg-card font-medium text-primary shadow-sm"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {step.step_number}. {step.step_name ?? "Etapa"}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-1 font-heading text-lg font-medium">
              {selectedStep
                ? `${selectedStep.step_number}. ${selectedStep.step_name ?? "Etapa"}`
                : "Sem dados"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Distribuição de respostas para esta etapa.
            </p>
            {error && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Não foi possível carregar resultados.
              </div>
            )}
            {loading || distribution.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {loading ? "Carregando..." : "Nenhuma resposta encontrada."}
              </div>
            ) : (
              <div className="space-y-6">
                {distribution.map((item, index) => {
                  const count = distributionCount(item)
                  const percentage = Number(
                    item.percentage ?? (totalAnswers ? (count / totalAnswers) * 100 : 0)
                  )

                  return (
                    <div key={`${distributionLabel(item)}-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{distributionLabel(item)}</span>
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {formatNumber(count)}
                          </span>{" "}
                          respostas ({formatPercent(percentage / 100)})
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-shrink-0 flex-col gap-4 md:w-72">
          <MetricCard
            title="Taxa de Interação"
            value={formatPercent(selectedStep?.interaction_rate)}
          />
          <MetricCard
            title="Acessos na Etapa"
            value={formatNumber(selectedStep?.entries)}
          />
          <MetricCard
            title="Passagem"
            value={formatPercent(selectedStep?.passage_rate)}
          />
          <MetricCard
            title="Avanços"
            value={formatNumber(selectedStep?.advances)}
          />
          <MetricCard
            title="Tempo Médio"
            value={formatDuration(selectedStep?.average_time_seconds)}
          />
        </div>
      </div>
    </div>
  )
}
