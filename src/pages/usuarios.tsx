import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Clock, Crown, Eye, Lock, Undo2, Users, Zap } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { EmptyState } from "@/components/atoms/empty-state"
import { PlanBadge } from "@/components/atoms/plan-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { SearchInput } from "@/components/atoms/search-input"
import { Skeleton } from "@/components/atoms/skeleton"
import { ApplyValueCard, type ApplyValueCardApplyState } from "@/components/composites/apply-value-card"
import { DataGrid } from "@/components/composites/data-grid"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { StatTile } from "@/components/composites/stat-tile"
import { UserDetailModal, type UserDetail } from "@/components/composites/user-detail-modal"
import { adminMutation, adminRpc } from "@/lib/admin-api"

type LeadStatus = "elite" | "trinca" | "vencendo" | "reembolsada" | "sem_acesso"

interface Lead {
  id: string
  name: string
  email: string
  status: LeadStatus
  objetivo: string
  sexo: string
  revenue: number
  refund: number
  idade: number
  peso: number
  altura: number
}

type AdminUserListRow = {
  user_id: string
  email: string
  nome_completo: string
  tier: string
  role: string
  is_active: boolean
  objective: string | null
  age: number | null
  sex: string | null
  created_at: string
  last_seen_at: string | null
  access_status: string | null
  cursor_created_at: string
  cursor_user_id: string
}

type AdminUsersRevenueRankRow = {
  user_id: string
  email: string
  nome_completo: string
  tier: string
  access_status: string | null
  revenue_net_cents: number
}

type AdminUserStatsRow = {
  total: number
  trinca: number
  elite: number
  reembolso: number
  sem_acesso: number
  vencendo: number
}

type AdminUserDetailRow = {
  user_profile: Record<string, unknown>
  latest_quiz_response: Record<string, unknown> | null
  current_program: Record<string, unknown> | null
  workout_rollup: Record<string, unknown> | null
  finance_rollup: Record<string, unknown> | null
  depends_on_future_rollups: boolean
}

type AdminAppSettingsRow = {
  reassessment_days: number | null
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "elite", label: "Elite" },
  { value: "trinca", label: "Trinca" },
  { value: "vencendo", label: "Vencendo" },
  { value: "reembolsada", label: "Reembolsada" },
  { value: "sem_acesso", label: "Sem acesso" },
]

const ALL = "__all__"

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function centsToReais(cents: unknown) {
  return typeof cents === "number" ? cents / 100 : 0
}

function buildSearchParams(term: string) {
  const trimmed = term.trim()
  if (!trimmed) return {}
  return trimmed.includes("@")
    ? { p_search_email_prefix: trimmed }
    : { p_search_name_prefix: trimmed }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function normalizeStatus(accessStatus: string | null | undefined, isActive: boolean): LeadStatus {
  if (!isActive) return "sem_acesso"
  if (accessStatus === "elite") return "elite"
  if (accessStatus === "refunded") return "reembolsada"
  if (accessStatus === "without_access") return "sem_acesso"
  if (accessStatus === "expiring") return "vencendo"
  return "trinca"
}

function rowToLead(row: AdminUserListRow, rank?: AdminUsersRevenueRankRow): Lead {
  return {
    id: row.user_id,
    name: row.nome_completo,
    email: row.email,
    status: normalizeStatus(row.access_status, row.is_active),
    objetivo: row.objective ?? "",
    sexo: row.sex ?? "",
    revenue: centsToReais(rank?.revenue_net_cents),
    refund: 0,
    idade: row.age ?? 0,
    peso: 0,
    altura: 0,
  }
}

function buildQuizAnswers(latestQuizResponse: Record<string, unknown> | null): UserDetail["quiz"] {
  const respostas = latestQuizResponse?.respostas
  const completedAt = stringValue(latestQuizResponse?.completed_at)
  const answers =
    respostas && typeof respostas === "object" && !Array.isArray(respostas)
      ? Object.entries(respostas as Record<string, unknown>).map(([pergunta, resposta]) => ({
          pergunta,
          resposta: typeof resposta === "string" ? resposta : JSON.stringify(resposta),
        }))
      : []

  return {
    nome: stringValue(latestQuizResponse?.quiz_type) ?? "Quiz",
    concluidoEm: completedAt ? dateTimeFormatter.format(new Date(completedAt)) : "Sem resposta registrada",
    respostas: answers,
  }
}

function buildUserDetail(row: AdminUserDetailRow, lead: Lead): UserDetail {
  const profile = row.user_profile
  const finance = row.finance_rollup
  const workout = row.workout_rollup
  const tier = stringValue(profile.tier)
  const accessStatus = stringValue(profile.access_status)
  const isActive = profile.is_active !== false
  const status = normalizeStatus(accessStatus, isActive)
  const programName = stringValue(row.current_program?.nome)
  const programFocus = stringValue(row.current_program?.foco)
  const frequency = numberValue(workout?.frequencia_semanal)

  return {
    id: stringValue(profile.user_id) ?? lead.id,
    name: stringValue(profile.nome_completo) ?? lead.name,
    email: stringValue(profile.email) ?? lead.email,
    topStatus: status === "elite" || status === "trinca" ? null : status,
    protocolo: row.current_program
      ? {
          liberado: true,
          mensagem: "Disponível para treinar agora",
          detalhe: [programName, programFocus].filter(Boolean).join(" · "),
        }
      : { liberado: false, mensagem: "Nenhum protocolo atual encontrado." },
    perfilFisico: {
      idade: numberValue(profile.idade) ?? 0,
      sexo: stringValue(profile.sexo) ?? "—",
      peso: numberValue(profile.peso_kg) ?? numberValue(profile.peso_mais_recente_kg) ?? 0,
      altura: numberValue(profile.altura_cm) ?? 0,
    },
    acessoGestao: {
      plano: tier === "elite" ? "elite" : "trinca",
      cargo: profile.role === "admin" ? "administrador" : "aluno",
      status: isActive ? "Ativo" : "Inativo",
      acesso: accessStatus ?? "—",
      compra: numberValue(finance?.purchase_count) ? "Com compra" : "Sem compra registrada",
      assinatura: status === "reembolsada" ? "Reembolsada" : "Ativa",
    },
    avaliacao: {
      objetivo: stringValue(profile.objetivo) ?? undefined,
      avaliacaoInicial: row.latest_quiz_response ? "Concluída" : "Pendente",
      cardVisualizado: Boolean(row.latest_quiz_response),
    },
    treinos: {
      concluidos: numberValue(workout?.total_concluidos)?.toString(),
      frequenciaLabel: frequency ? "Com atividade" : "Sem atividade recente",
      frequenciaPercent: frequency ? Math.min(Math.round(frequency * 100), 100) : 0,
    },
    reavaliacao: { definida: false },
    cargas: [],
    quiz: buildQuizAnswers(row.latest_quiz_response),
  }
}

function StatusBadge({ status }: { status: LeadStatus }) {
  if (status === "elite") return <PlanBadge plan="elite" />
  if (status === "trinca") return <PlanBadge plan="trinca" />
  if (status === "vencendo") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600">
        <Clock className="size-3" />
        Vencendo
      </Badge>
    )
  }
  if (status === "reembolsada") {
    return (
      <Badge variant="destructive" className="gap-1">
        <Undo2 className="size-3" />
        Reembolsada
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Lock className="size-3" />
      Sem acesso
    </Badge>
  )
}

interface UsuariosPageProps {
  canEdit?: boolean
}

export function UsuariosPage({ canEdit: canEditProp }: UsuariosPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [objetivo, setObjetivo] = useState(ALL)
  const [sexo, setSexo] = useState(ALL)
  const [status, setStatus] = useState<LeadStatus | typeof ALL>(ALL)
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<AdminUserStatsRow>({
    total: 0,
    trinca: 0,
    elite: 0,
    reembolso: 0,
    sem_acesso: 0,
    vencendo: 0,
  })
  const [cursor, setCursor] = useState<{ createdAt: string; userId: string } | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const rankByUserIdRef = useRef(new Map<string, AdminUsersRevenueRankRow>())
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [reavaliacaoDias, setReavaliacaoDias] = useState("")
  const [lastAppliedText, setLastAppliedText] = useState<string | undefined>()
  const [applyState, setApplyState] = useState<ApplyValueCardApplyState>("idle")

  const [appliedSearch, setAppliedSearch] = useState("")

  useEffect(() => {
    const handle = setTimeout(() => {
      setAppliedSearch(search.trim())
    }, 400)
    return () => clearTimeout(handle)
  }, [search])

  function handleSearchEnter(value: string) {
    setAppliedSearch(value.trim())
  }

  const isFirstLoadRef = useRef(true)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let active = true
    const isFirstLoad = isFirstLoadRef.current

    async function loadUsers() {
      if (isFirstLoad) setLoading(true)
      else setSearching(true)
      setError(null)

      try {
        const searchParams = buildSearchParams(appliedSearch)
        const [users, rank, settings, statsRows] = await Promise.all([
          adminRpc<AdminUserListRow[]>("admin_users_list", { p_limit: 100, ...searchParams }),
          adminRpc<AdminUsersRevenueRankRow[]>("admin_users_revenue_rank", { p_limit: 100 }),
          adminRpc<AdminAppSettingsRow[]>("admin_app_settings_current"),
          adminRpc<AdminUserStatsRow[]>("admin_users_stats"),
        ])

        if (!active) return

        const rankByUserId = new Map(rank.map((row) => [row.user_id, row]))
        rankByUserIdRef.current = rankByUserId
        setLeads(users.map((row) => rowToLead(row, rankByUserId.get(row.user_id))))

        const lastUser = users[users.length - 1]
        setCursor(lastUser ? { createdAt: lastUser.cursor_created_at, userId: lastUser.cursor_user_id } : null)
        setHasMore(users.length === 100)

        if (statsRows[0]) setStats(statsRows[0])

        const reassessmentDays = settings[0]?.reassessment_days
        if (typeof reassessmentDays === "number") {
          setReavaliacaoDias(String(reassessmentDays))
          setLastAppliedText(`Prazo global atual: ${reassessmentDays} dia(s)`)
        }
      } catch (loadError) {
        if (!active) return
        setLeads([])
        setError(loadError instanceof Error ? loadError.message : "Erro ao carregar usuários.")
      } finally {
        if (active) {
          if (isFirstLoad) {
            setLoading(false)
            isFirstLoadRef.current = false
          } else {
            setSearching(false)
          }
        }
      }
    }

    void loadUsers()

    return () => {
      active = false
    }
  }, [appliedSearch])

  async function handleLoadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    setError(null)

    try {
      const searchParams = buildSearchParams(appliedSearch)
      const users = await adminRpc<AdminUserListRow[]>("admin_users_list", {
        p_before_created_at: cursor.createdAt,
        p_before_user_id: cursor.userId,
        p_limit: 100,
        ...searchParams,
      })

      setLeads((current) => [
        ...current,
        ...users.map((row) => rowToLead(row, rankByUserIdRef.current.get(row.user_id))),
      ])

      const lastUser = users[users.length - 1]
      setCursor(lastUser ? { createdAt: lastUser.cursor_created_at, userId: lastUser.cursor_user_id } : null)
      setHasMore(users.length === 100)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar mais usuários.")
    } finally {
      setLoadingMore(false)
    }
  }

  const [objetivoOptions, setObjetivoOptions] = useState<string[]>([])
  const [sexoOptions, setSexoOptions] = useState<string[]>([])

  useEffect(() => {
    let active = true

    adminRpc<{ objetivos: string[]; sexos: string[] }[]>("admin_users_filter_options")
      .then((rows) => {
        if (!active) return
        const row = rows[0]
        setObjetivoOptions(row?.objetivos ?? [])
        setSexoOptions(row?.sexos ?? [])
      })
      .catch(() => {
        // Filtro fica vazio (só "Todos") se a RPC falhar — não bloqueia a
        // lista de leads, que já carrega separadamente.
      })

    return () => {
      active = false
    }
  }, [])

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase()
    return leads
      .filter((lead) => {
        if (term && !lead.name.toLowerCase().includes(term) && !lead.email.toLowerCase().includes(term)) {
          return false
        }
        if (objetivo !== ALL && lead.objetivo !== objetivo) return false
        if (sexo !== ALL && lead.sexo !== sexo) return false
        if (status !== ALL && lead.status !== status) return false
        return true
      })
      .sort((a, b) => b.revenue - b.refund - (a.revenue - a.refund))
  }, [leads, search, objetivo, sexo, status])

  async function handleSelectLead(lead: Lead) {
    setSelectedLead(lead)
    setSelectedUserDetail(null)
    setDetailError(null)
    setDetailLoading(true)

    try {
      const rows = await adminRpc<AdminUserDetailRow[]>("admin_user_detail", { p_user_id: lead.id })
      const detail = rows[0]
      if (!detail) throw new Error("Usuário não encontrado no detalhe admin.")
      setSelectedUserDetail(buildUserDetail(detail, lead))
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : "Erro ao carregar detalhe do usuário.")
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleApplyReavaliacao() {
    if (applyState !== "idle") return

    const days = Number(reavaliacaoDias)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError("Informe um prazo de reavaliação entre 1 e 365 dias.")
      return
    }

    setApplyState("loading")
    setError(null)

    try {
      const response = await adminMutation<{ reassessmentDays: number; updatedAt: string }>(
        "/admin/settings/reassessment",
        { method: "PATCH", body: { reassessmentDays: days } }
      )
      setLastAppliedText(
        `Último prazo global aplicado em ${dateTimeFormatter.format(new Date(response.updatedAt))} (${response.reassessmentDays} dias)`
      )
      setApplyState("success")
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Erro ao aplicar reavaliação.")
      setApplyState("idle")
    }
  }

  const dataGridColumns = [
    "#",
    "Lead",
    "Status",
    "Receita",
    "Reembolso",
    "Faturamento líquido",
    ...(canEdit ? ["Ação"] : []),
  ]

  const dataGridRows = filteredLeads.map((lead, index) => {
    const net = lead.revenue - lead.refund
    const row: React.ReactNode[] = [
      index + 1,
      <div key="lead" className="flex flex-col">
        <span className="font-medium text-foreground">{lead.name}</span>
        <span className="text-xs text-muted-foreground">{lead.email}</span>
      </div>,
      <StatusBadge key="status" status={lead.status} />,
      currencyFormatter.format(lead.revenue),
      currencyFormatter.format(lead.refund),
      <span key="net" className="font-semibold text-foreground">
        {currencyFormatter.format(net)}
      </span>,
    ]
    if (canEdit) {
      row.push(
        <Button key="action" type="button" size="sm" variant="outline" onClick={() => handleSelectLead(lead)}>
          <Eye className="size-3.5" />
          Ver lead
        </Button>
      )
    }
    return row
  })

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader title="Usuários" className="items-start" />

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Total" value={stats.total} icon={Users} tone="blue" />
            <StatTile label="Trinca" value={stats.trinca} icon={Zap} tone="blue" />
            <StatTile label="Elite" value={stats.elite} icon={Crown} tone="purple" />
            <StatTile label="Reembolso" value={stats.reembolso} icon={Undo2} tone="red" />
            <StatTile label="Sem acesso" value={stats.sem_acesso} icon={Lock} tone="amber" />
          </div>
        )}

        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center">
          <SearchInput
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={setSearch}
            onSearch={handleSearchEnter}
            className="w-full lg:w-[240px]"
          />
          {searching && <span className="text-sm text-muted-foreground">Buscando...</span>}
          <Select value={objetivo} onValueChange={setObjetivo}>
            <SelectTrigger className="w-full lg:w-[170px]">
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos objetivos</SelectItem>
              {objetivoOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sexo} onValueChange={setSexo}>
            <SelectTrigger className="w-full lg:w-[140px]">
              <SelectValue placeholder="Sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {sexoOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as LeadStatus | typeof ALL)}>
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos status</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2 rounded-md border border-border p-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState icon={Users} message="Nenhum lead encontrado para os filtros aplicados." />
        ) : (
          <DataGrid columns={dataGridColumns} data={dataGridRows} />
        )}

        {!loading && hasMore && (
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <ApplyValueCard
            title="Prazo de avaliação global"
            description="Dias para reset automático de protocolo, usando a configuração real do backend."
            label="Prazo global de avaliação (em dias)"
            value={reavaliacaoDias}
            onChange={setReavaliacaoDias}
            onApply={handleApplyReavaliacao}
            canApply={canEdit}
            applyState={applyState}
            helpText={`Ao aplicar, todos os alunos passam a ter o protocolo resetado a cada ${reavaliacaoDias || 0} dia(s).`}
            lastAppliedText={lastAppliedText}
          />
        )}
      </div>

      {selectedLead && (
        detailLoading ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/80">
            <Skeleton className="h-40 w-full max-w-xl rounded-lg" />
          </div>
        ) : detailError ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
            <div className="max-w-md rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">
              {detailError}
              <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => setSelectedLead(null)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : selectedUserDetail ? (
          <UserDetailModal
            user={selectedUserDetail}
            canEdit={canEdit}
            onClose={() => setSelectedLead(null)}
          />
        ) : null
      )}
    </div>
  )
}
