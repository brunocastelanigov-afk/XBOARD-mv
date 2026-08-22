import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Eye,
  FileQuestion,
  Loader2,
  MessageSquareText,
  Users,
} from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { EmptyState } from "@/components/atoms/empty-state"
import { ProgressListItem } from "@/components/atoms/progress-list-item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { SearchInput } from "@/components/atoms/search-input"
import { Skeleton } from "@/components/atoms/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { DonutChartCard, type DonutChartCardDatum } from "@/components/composites/donut-chart-card"
import { DrilldownQuestionCard } from "@/components/composites/drilldown-question-card"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { StatTile } from "@/components/composites/stat-tile"
import { adminRpc } from "@/lib/admin-crm-api"

type RespostasSubTab = "por-usuario" | "por-pergunta"

const ALL = "__all__"
const chartColors = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6", "#64748b"]

interface AdminQuizResponseRow {
  response_id: string
  user_id: string
  user_name: string
  user_email: string
  quiz_type: string
  completed_at: string
  answers_count: number
  respostas: unknown
  cursor_completed_at: string
  cursor_response_id: string
}

interface AdminQuizResponseDetailRow {
  response_id: string
  user_id: string
  user_name: string
  user_email: string
  quiz_type: string
  completed_at: string
  respostas: unknown
}

interface AdminQuizQuestionStatsRow {
  quiz_type: string
  question_key: string
  question_label: string
  answer_key: string
  answer_label: string
  answer_count: number
  latest_answer_at: string | null
  depends_on_rollup: boolean
  blocked_by: string | null
}

interface AdminQuizAnalyticsSummaryRow {
  total_responses: number
  unique_respondents: number
  distinct_questions_tracked: number
  rollup_watermark: string | null
  rollup_status: string | null
}

interface QuizAnswer {
  pergunta: string
  resposta: string
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return dateTimeFormatter.format(new Date(value))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value)) return value.map(valueToText).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function answersFromPayload(payload: unknown): QuizAnswer[] {
  if (Array.isArray(payload)) {
    return payload.map((item, index) => {
      const row = asRecord(item)
      return {
        pergunta: valueToText(row.pergunta ?? row.question ?? row.question_label ?? `Resposta ${index + 1}`),
        resposta: valueToText(row.resposta ?? row.answer ?? row.value ?? item),
      }
    })
  }

  const record = asRecord(payload)
  return Object.entries(record).map(([key, value]) => ({
    pergunta: key,
    resposta: valueToText(value),
  }))
}

function findAnswer(payload: unknown, patterns: RegExp[]) {
  const answers = answersFromPayload(payload)
  const match = answers.find((answer) => patterns.some((pattern) => pattern.test(answer.pergunta)))
  return match?.resposta
}

function responseBadges(response: AdminQuizResponseRow) {
  const idade = findAnswer(response.respostas, [/idade/i])
  const sexo = findAnswer(response.respostas, [/g[eê]nero/i, /sexo/i])
  const experiencia = findAnswer(response.respostas, [/experi[eê]ncia/i])
  return [
    ...(idade ? [{ label: `${idade} anos`, variant: "outline" as const }] : []),
    ...(sexo ? [{ label: sexo, variant: "outline" as const }] : []),
    ...(experiencia
      ? [{ label: experiencia, variant: "outline" as const, className: "border-amber-500/30 bg-amber-500/10 text-amber-600" }]
      : []),
    { label: response.quiz_type, variant: "secondary" as const },
  ]
}

function groupQuestionStats(rows: AdminQuizQuestionStatsRow[]) {
  const map = new Map<string, AdminQuizQuestionStatsRow[]>()
  for (const row of rows) {
    const key = `${row.quiz_type}:${row.question_key}`
    map.set(key, [...(map.get(key) ?? []), row])
  }
  return Array.from(map.entries()).map(([id, options], index) => {
    const total = options.reduce((sum, item) => sum + item.answer_count, 0)
    const first = options[0]
    return {
      id,
      index: index + 1,
      quizType: first.quiz_type,
      questionKey: first.question_key,
      questionLabel: first.question_label,
      total,
      options,
    }
  })
}

function statsToDonutData(rows: AdminQuizQuestionStatsRow[]): DonutChartCardDatum[] {
  return rows.map((row, index) => ({
    label: row.answer_label || row.answer_key || "Sem resposta",
    value: row.answer_count,
    color: chartColors[index % chartColors.length],
  }))
}

function StatGridSkeleton({ columns }: { columns: number }) {
  const gridClass =
    columns === 4
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
  return (
    <div className={gridClass}>
      {Array.from({ length: columns }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  )
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

function SummaryTiles({
  summary,
  loading,
}: {
  summary: AdminQuizAnalyticsSummaryRow | null
  loading: boolean
}) {
  if (loading) return <StatGridSkeleton columns={3} />

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatTile label="Respostas" value={summary?.total_responses ?? 0} icon={MessageSquareText} tone="blue" />
      <StatTile label="Respondentes" value={summary?.unique_respondents ?? 0} icon={Users} tone="green" />
      <StatTile
        label="Perguntas rastreadas"
        value={summary?.distinct_questions_tracked ?? 0}
        icon={FileQuestion}
        tone="purple"
        description={summary?.rollup_watermark ? `Rollup: ${formatDateTime(summary.rollup_watermark)}` : summary?.rollup_status ?? undefined}
      />
    </div>
  )
}

function PorUsuarioView({
  canEdit,
  loading,
  responses,
}: {
  canEdit: boolean
  loading: boolean
  responses: AdminQuizResponseRow[]
}) {
  const [search, setSearch] = useState("")
  const [quizType, setQuizType] = useState(ALL)
  const [selected, setSelected] = useState<AdminQuizResponseDetailRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const quizTypeOptions = useMemo(
    () => Array.from(new Set(responses.map((response) => response.quiz_type))).sort(),
    [responses]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return responses.filter((response) => {
      const answers = answersFromPayload(response.respostas)
      const answerText = answers.map((answer) => `${answer.pergunta} ${answer.resposta}`).join(" ").toLowerCase()
      if (
        term &&
        !response.user_name.toLowerCase().includes(term) &&
        !response.user_email.toLowerCase().includes(term) &&
        !answerText.includes(term)
      ) {
        return false
      }
      if (quizType !== ALL && response.quiz_type !== quizType) return false
      return true
    })
  }, [responses, search, quizType])

  async function openDetail(response: AdminQuizResponseRow) {
    setSelected(null)
    setDetailError(null)
    setDetailLoading(true)

    try {
      const rows = await adminRpc<AdminQuizResponseDetailRow[]>("admin_quiz_response_detail", {
        p_response_id: response.response_id,
      })
      const detail = rows[0]
      if (!detail) throw new Error("Resposta de quiz não encontrada.")
      setSelected(detail)
    } catch (loadError) {
      setDetailError(errorMessage(loadError, "Erro ao carregar detalhe da resposta."))
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            placeholder="Buscar por nome, e-mail, pergunta ou resposta..."
            value={search}
            onChange={setSearch}
            className="w-full lg:w-[320px]"
          />
          <Select value={quizType} onValueChange={setQuizType}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Tipo de quiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os quizzes</SelectItem>
              {quizTypeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Mostrando {filtered.length} de {responses.length}
        </span>
      </div>

      {detailError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {detailError}
        </p>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} message="Nenhuma resposta encontrada para os filtros aplicados." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((response) => (
            <EntityCard
              key={response.response_id}
              title={response.user_name}
              metadata={[response.user_email, formatDateTime(response.completed_at), `${response.answers_count} resposta(s)`]}
              badges={responseBadges(response)}
            >
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={detailLoading || !canEdit}
                  onClick={() => openDetail(response)}
                >
                  {detailLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                  Ver respostas
                </Button>
              </div>
            </EntityCard>
          ))}
        </div>
      )}

      {selected && (
        <QuizResponseModal response={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function QuizResponseModal({ response, onClose }: { response: AdminQuizResponseDetailRow; onClose: () => void }) {
  const answers = answersFromPayload(response.respostas)
  return (
    <EntityEditModalShell
      title={response.user_name}
      description={`${response.user_email} · ${formatDateTime(response.completed_at)}`}
      onClose={onClose}
      className="max-w-3xl"
      footer={
        <Button type="button" variant="outline" onClick={onClose} className="w-full">
          Fechar
        </Button>
      }
    >
      <div className="space-y-3">
        <Badge variant="secondary">{response.quiz_type}</Badge>
        {answers.length === 0 ? (
          <EmptyState icon={FileQuestion} message="A resposta não possui payload de quiz." />
        ) : (
          answers.map((answer, index) => (
            <div key={`${answer.pergunta}-${index}`} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
              <p className="font-medium text-foreground">{answer.pergunta}</p>
              <p className="mt-1 text-muted-foreground">{answer.resposta}</p>
            </div>
          ))
        )}
      </div>
    </EntityEditModalShell>
  )
}

function PorPerguntaView({
  loading,
  stats,
}: {
  loading: boolean
  stats: AdminQuizQuestionStatsRow[]
}) {
  const [search, setSearch] = useState("")
  const [quizType, setQuizType] = useState(ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const questions = useMemo(() => groupQuestionStats(stats), [stats])
  const quizTypeOptions = useMemo(
    () => Array.from(new Set(stats.map((row) => row.quiz_type))).sort(),
    [stats]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return questions.filter((question) => {
      if (term && !question.questionLabel.toLowerCase().includes(term)) return false
      if (quizType !== ALL && question.quizType !== quizType) return false
      return true
    })
  }, [questions, search, quizType])

  const selected = selectedId ? questions.find((question) => question.id === selectedId) : null

  if (selected) {
    const donutData = statsToDonutData(selected.options)
    const total = Math.max(selected.total, 1)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Voltar" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">{selected.quizType}</p>
            <h4 className="font-semibold">{selected.questionLabel}</h4>
            <p className="text-xs text-muted-foreground">{selected.total} resposta(s) no rollup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DonutChartCard title="Distribuição" data={donutData} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contagem por opção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected.options.map((item) => (
                <ProgressListItem
                  key={`${item.answer_key}-${item.answer_label}`}
                  label={item.answer_label || item.answer_key || "Sem resposta"}
                  value={`${item.answer_count} (${Math.round((item.answer_count / total) * 100)}%)`}
                  percent={Math.round((item.answer_count / total) * 100)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center">
        <SearchInput
          placeholder="Buscar pergunta..."
          value={search}
          onChange={setSearch}
          className="w-full lg:w-[280px]"
        />
        <Select value={quizType} onValueChange={setQuizType}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Tipo de quiz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os quizzes</SelectItem>
            {quizTypeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileQuestion} message="Nenhuma pergunta encontrada." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((question) => (
            <div
              key={question.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setSelectedId(question.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedId(question.id)
              }}
            >
              <DrilldownQuestionCard
                index={question.index}
                question={question.questionLabel}
                type={question.quizType}
                respondedCount={question.total}
                arrivalPercent={100}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AvaliacaoPageProps {
  canEdit?: boolean
}

export function AvaliacaoPage({ canEdit: canEditProp }: AvaliacaoPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceLoading = searchParams.get("loading") === "1"
  const forceEmpty = searchParams.get("empty") === "1"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subTab, setSubTab] = useState<RespostasSubTab>("por-usuario")
  const [responses, setResponses] = useState<AdminQuizResponseRow[]>([])
  const [questionStats, setQuestionStats] = useState<AdminQuizQuestionStatsRow[]>([])
  const [summary, setSummary] = useState<AdminQuizAnalyticsSummaryRow | null>(null)

  async function loadAvaliacao() {
    setLoading(true)
    setError(null)

    try {
      const [responseRows, statsRows, summaryRows] = await Promise.all([
        adminRpc<AdminQuizResponseRow[]>("admin_quiz_responses_by_user", { p_limit: 100 }),
        adminRpc<AdminQuizQuestionStatsRow[]>("admin_quiz_question_stats", { p_limit: 1000 }),
        adminRpc<AdminQuizAnalyticsSummaryRow[]>("admin_quiz_analytics_summary"),
      ])

      setResponses(responseRows)
      setQuestionStats(statsRows)
      setSummary(summaryRows[0] ?? null)
    } catch (loadError) {
      setResponses([])
      setQuestionStats([])
      setSummary(null)
      setError(errorMessage(loadError, "Erro ao carregar avaliação."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (forceLoading) return
    void loadAvaliacao()
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const visibleResponses = forceEmpty ? [] : responses
  const visibleStats = forceEmpty ? [] : questionStats

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EntityListHeader title="Avaliação" className="items-start" />

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <SummaryTiles summary={summary} loading={isLoading} />

        <Tabs value={subTab} onValueChange={(value) => setSubTab(value as RespostasSubTab)}>
          <TabsList className="sticky top-0 z-20">
            <TabsTrigger value="por-usuario" className="gap-1.5">
              <Users className="size-4" />
              Por Usuário
            </TabsTrigger>
            <TabsTrigger value="por-pergunta" className="gap-1.5">
              <FileQuestion className="size-4" />
              Por Pergunta
            </TabsTrigger>
          </TabsList>
          <TabsContent value="por-usuario" className="mt-4">
            <PorUsuarioView canEdit={canEdit} loading={isLoading} responses={visibleResponses} />
          </TabsContent>
          <TabsContent value="por-pergunta" className="mt-4">
            <PorPerguntaView loading={isLoading} stats={visibleStats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
