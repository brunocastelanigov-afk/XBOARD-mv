import { useEffect, useMemo, useState } from "react"
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

type LeadStatus = "elite" | "trinca" | "vencendo" | "reembolsada" | "sem_acesso"

interface Lead {
  id: string
  name: string
  email: string
  status: LeadStatus
  objetivo: string
  sexo: string
  renda: string
  frequencia: string
  revenue: number
  refund: number
  idade: number
  peso: number
  altura: number
  cargasRastreadas?: { exercicio: string; cargaAtual: string }[]
}

const OBJETIVO_OPTIONS = ["Crescer", "Secar Muito", "Crescer e Secar"]
const SEXO_OPTIONS = ["Homem", "Mulher"]
// Nota: opções de renda reaproveitadas por analogia das faixas de "gasto_mensal" já
// confirmadas em P09/Campos disponíveis — não há print/texto que confirme os rótulos
// exatos do filtro "renda" de P02. Sinalizar para confirmação visual.
const RENDA_OPTIONS = ["Até R$ 500", "R$ 500 – R$ 1.000", "Acima de R$ 3.000"]
// Nota: apenas "alta"/"baixa" estão confirmados no texto do briefing (P01, cards "Freq.
// média alta"/"Freq. média baixa"). Sem confirmação de uma faixa "média" para este filtro.
const FREQUENCIA_OPTIONS = ["Alta", "Baixa"]

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "elite", label: "Elite" },
  { value: "trinca", label: "Trinca" },
  { value: "vencendo", label: "Vencendo" },
  { value: "reembolsada", label: "Reembolsada" },
  { value: "sem_acesso", label: "Sem acesso" },
]

const ALL = "__all__"

const MOCK_LEADS: Lead[] = [
  { id: "1", name: "Ana Paula Ferreira", email: "ana.ferreira@email.com", status: "elite", objetivo: "Crescer", sexo: "Mulher", renda: "Acima de R$ 3.000", frequencia: "Alta", revenue: 1970, refund: 0, idade: 32, peso: 64, altura: 165 },
  { id: "2", name: "Carlos Eduardo Souza", email: "carlos.souza@email.com", status: "trinca", objetivo: "Crescer e Secar", sexo: "Homem", renda: "R$ 500 – R$ 1.000", frequencia: "Alta", revenue: 297, refund: 0, idade: 27, peso: 82, altura: 178 },
  { id: "3", name: "Bruna Martins", email: "bruna.martins@email.com", status: "elite", objetivo: "Secar Muito", sexo: "Mulher", renda: "Acima de R$ 3.000", frequencia: "Baixa", revenue: 1970, refund: 0, idade: 41, peso: 71, altura: 168 },
  { id: "4", name: "Diego Ramos", email: "diego.ramos@email.com", status: "vencendo", objetivo: "Crescer", sexo: "Homem", renda: "Até R$ 500", frequencia: "Baixa", revenue: 297, refund: 0, idade: 35, peso: 79, altura: 175 },
  {
    id: "5",
    name: "Fernanda Lima",
    email: "fernanda.lima@email.com",
    status: "trinca",
    objetivo: "Crescer e Secar",
    sexo: "Mulher",
    renda: "R$ 500 – R$ 1.000",
    frequencia: "Alta",
    revenue: 594,
    refund: 0,
    idade: 29,
    peso: 68,
    altura: 170,
    cargasRastreadas: [
      { exercicio: "Supino reto com barra", cargaAtual: "42,5 kg · 4x10" },
      { exercicio: "Agachamento livre", cargaAtual: "60 kg · 4x10" },
      { exercicio: "Remada curvada com barra", cargaAtual: "35 kg · 4x10" },
    ],
  },
  { id: "6", name: "Gustavo Pereira", email: "gustavo.pereira@email.com", status: "reembolsada", objetivo: "Secar Muito", sexo: "Homem", renda: "Até R$ 500", frequencia: "Baixa", revenue: 297, refund: 297, idade: 49, peso: 70, altura: 170 },
  { id: "7", name: "Helena Costa", email: "helena.costa@email.com", status: "sem_acesso", objetivo: "Crescer", sexo: "Mulher", renda: "Até R$ 500", frequencia: "Baixa", revenue: 0, refund: 0, idade: 38, peso: 66, altura: 162 },
  { id: "8", name: "Igor Almeida", email: "igor.almeida@email.com", status: "elite", objetivo: "Crescer e Secar", sexo: "Homem", renda: "Acima de R$ 3.000", frequencia: "Alta", revenue: 1970, refund: 0, idade: 31, peso: 85, altura: 180 },
  { id: "9", name: "Juliana Rocha", email: "juliana.rocha@email.com", status: "trinca", objetivo: "Secar Muito", sexo: "Mulher", renda: "R$ 500 – R$ 1.000", frequencia: "Baixa", revenue: 297, refund: 0, idade: 44, peso: 73, altura: 166 },
  { id: "10", name: "Lucas Barbosa", email: "lucas.barbosa@email.com", status: "trinca", objetivo: "Crescer", sexo: "Homem", renda: "Até R$ 500", frequencia: "Alta", revenue: 297, refund: 0, idade: 24, peso: 74, altura: 176 },
  { id: "11", name: "Mariana Duarte", email: "mariana.duarte@email.com", status: "vencendo", objetivo: "Crescer e Secar", sexo: "Mulher", renda: "Acima de R$ 3.000", frequencia: "Alta", revenue: 1970, refund: 0, idade: 33, peso: 63, altura: 164 },
  { id: "12", name: "Rafael Nogueira", email: "rafael.nogueira@email.com", status: "reembolsada", objetivo: "Secar Muito", sexo: "Homem", renda: "Acima de R$ 3.000", frequencia: "Baixa", revenue: 1970, refund: 1970, idade: 52, peso: 91, altura: 174 },
  { id: "13", name: "Sabrina Teixeira", email: "sabrina.teixeira@email.com", status: "trinca", objetivo: "Crescer", sexo: "Mulher", renda: "R$ 500 – R$ 1.000", frequencia: "Alta", revenue: 297, refund: 0, idade: 26, peso: 60, altura: 160 },
  { id: "14", name: "Thiago Cardoso", email: "thiago.cardoso@email.com", status: "elite", objetivo: "Crescer e Secar", sexo: "Homem", renda: "R$ 500 – R$ 1.000", frequencia: "Baixa", revenue: 1970, refund: 0, idade: 37, peso: 88, altura: 182 },
]

const QUIZ_QUESTIONS = [
  "Qual é o seu gênero?",
  "Qual é a sua idade?",
  "Qual é a sua altura?",
  "Qual é o seu peso atual?",
  "Como está sua composição corporal hoje?",
  "Qual é a sua experiência com academia?",
  "Está treinando atualmente?",
  "Pratica algum outro esporte?",
  "Qual é o seu principal objetivo com o treino?",
  "Quanto você gasta por mês com alimentação, suplementos e treinamentos para melhorar o seu físico?",
  "Qual é a sua urgência para melhorar seu físico?",
  "Tem alguma dor ou problema físico que precisamos saber?",
]

function buildUserDetail(lead: Lead): UserDetail {
  const topStatus = lead.status === "reembolsada" || lead.status === "vencendo" || lead.status === "sem_acesso" ? lead.status : null
  const plano: UserDetail["acessoGestao"]["plano"] = lead.status === "elite" ? "elite" : "trinca"
  const frequenciaPercent = lead.frequencia === "Alta" ? 62 : 0

  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    topStatus,
    protocolo:
      lead.status === "sem_acesso"
        ? { liberado: false, mensagem: "Aguardando liberação de acesso." }
        : {
            liberado: true,
            mensagem: "Disponível para treinar agora",
            detalhe: "Treino Experiente - Para Crescer e Secar · 3 dias de treino",
          },
    perfilFisico: {
      idade: lead.idade,
      sexo: lead.sexo,
      peso: lead.peso,
      altura: lead.altura,
    },
    acessoGestao: {
      plano,
      cargo: "aluno",
      status: lead.status === "sem_acesso" ? "Inativo" : "Ativo",
      acesso: "Criado",
      compra: lead.status === "reembolsada" ? "Reembolsada" : "Pendente",
      assinatura: lead.status === "vencendo" ? "Vencendo" : "Vencido",
    },
    avaliacao: {
      objetivo: lead.objetivo,
      avaliacaoInicial: "Concluída",
      cardVisualizado: false,
    },
    treinos: {
      frequenciaLabel: lead.frequencia,
      frequenciaPercent,
    },
    reavaliacao: {
      definida: false,
    },
    cargas: (lead.cargasRastreadas ?? []).map((item) => ({ exercicio: item.exercicio, cargaAtual: item.cargaAtual })),
    quiz: {
      nome: "Quiz inicial",
      concluidoEm: "29/07/2026",
      respostas: [
        { pergunta: QUIZ_QUESTIONS[0], resposta: lead.sexo },
        { pergunta: QUIZ_QUESTIONS[1], resposta: String(lead.idade) },
        { pergunta: QUIZ_QUESTIONS[2], resposta: `${lead.altura} cm` },
        { pergunta: QUIZ_QUESTIONS[3], resposta: `${lead.peso} kg` },
        { pergunta: QUIZ_QUESTIONS[4], resposta: "Magro com barriga - Corpo fino mas com barriga" },
        { pergunta: QUIZ_QUESTIONS[5], resposta: "Intermediário - 6 meses a 1 ano de treino" },
        { pergunta: QUIZ_QUESTIONS[6], resposta: "Não" },
        { pergunta: QUIZ_QUESTIONS[7], resposta: "Não" },
        { pergunta: QUIZ_QUESTIONS[8], resposta: `${lead.objetivo} - Ganhar músculo e perder gordura` },
        { pergunta: QUIZ_QUESTIONS[9], resposta: lead.renda },
        { pergunta: QUIZ_QUESTIONS[10], resposta: lead.frequencia === "Alta" ? "Muito alta" : "Normal" },
        { pergunta: QUIZ_QUESTIONS[11], resposta: "Não" },
      ],
    },
  }
}

const MOCK_REAVALIACAO_DIAS = 45
const MOCK_LAST_APPLIED_TEXT = "Último prazo global aplicado em 14/05/2026, 02:11 (45 dias)"

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

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
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [objetivo, setObjetivo] = useState(ALL)
  const [sexo, setSexo] = useState(ALL)
  const [renda, setRenda] = useState(ALL)
  const [frequencia, setFrequencia] = useState(ALL)
  const [status, setStatus] = useState<LeadStatus | typeof ALL>(ALL)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const [reavaliacaoDias, setReavaliacaoDias] = useState(String(MOCK_REAVALIACAO_DIAS))
  const [lastAppliedText, setLastAppliedText] = useState(MOCK_LAST_APPLIED_TEXT)
  const [applyState, setApplyState] = useState<ApplyValueCardApplyState>("idle")

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  const isLoading = forceLoading || loading

  const stats = useMemo(() => {
    return {
      total: MOCK_LEADS.length,
      trinca: MOCK_LEADS.filter((lead) => lead.status === "trinca").length,
      elite: MOCK_LEADS.filter((lead) => lead.status === "elite").length,
      reembolso: MOCK_LEADS.filter((lead) => lead.status === "reembolsada").length,
      semAcesso: MOCK_LEADS.filter((lead) => lead.status === "sem_acesso").length,
    }
  }, [])

  const filteredLeads = useMemo(() => {
    if (forceEmpty) return []
    const term = search.trim().toLowerCase()
    return MOCK_LEADS.filter((lead) => {
      if (term && !lead.name.toLowerCase().includes(term) && !lead.email.toLowerCase().includes(term)) {
        return false
      }
      if (objetivo !== ALL && lead.objetivo !== objetivo) return false
      if (sexo !== ALL && lead.sexo !== sexo) return false
      if (renda !== ALL && lead.renda !== renda) return false
      if (frequencia !== ALL && lead.frequencia !== frequencia) return false
      if (status !== ALL && lead.status !== status) return false
      return true
    }).sort((a, b) => b.revenue - b.refund - (a.revenue - a.refund))
  }, [forceEmpty, search, objetivo, sexo, renda, frequencia, status])

  function handleApplyReavaliacao() {
    if (applyState !== "idle") return
    const days = Number(reavaliacaoDias)
    if (!Number.isFinite(days)) return
    setApplyState("loading")
    setTimeout(() => {
      const now = new Date()
      const formattedDate = now.toLocaleDateString("pt-BR")
      const formattedTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      setLastAppliedText(`Último prazo global aplicado em ${formattedDate}, ${formattedTime} (${days} dias)`)
      setApplyState("success")
      setTimeout(() => setApplyState("idle"), 1600)
    }, 900)
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
        <Button
          key="action"
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setSelectedLead(lead)}
        >
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

        {/* B — grid de métricas */}
        {isLoading ? (
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
            <StatTile label="Sem acesso" value={stats.semAcesso} icon={Lock} tone="amber" />
          </div>
        )}

        {/* C — busca + filtros, sticky, sempre interativa */}
        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center">
          <SearchInput
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={setSearch}
            className="w-full lg:w-[240px]"
          />
          <Select value={objetivo} onValueChange={setObjetivo}>
            <SelectTrigger className="w-full lg:w-[170px]">
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos objetivos</SelectItem>
              {OBJETIVO_OPTIONS.map((option) => (
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
              {SEXO_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={renda} onValueChange={setRenda}>
            <SelectTrigger className="w-full lg:w-[190px]">
              <SelectValue placeholder="Renda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas rendas</SelectItem>
              {RENDA_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={frequencia} onValueChange={setFrequencia}>
            <SelectTrigger className="w-full lg:w-[150px]">
              <SelectValue placeholder="Frequência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {FREQUENCIA_OPTIONS.map((option) => (
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

        {/* D — ranking por faturamento total (receita − reembolso) */}
        {isLoading ? (
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

        {/* E — prazo de avaliação global */}
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <ApplyValueCard
            title="Prazo de avaliação global"
            description="Dias para reset automático de protocolo, mapeado nos 6 tipos de protocolo existentes (versão inicial = versão A)."
            label="Prazo global de avaliação (em dias)"
            value={reavaliacaoDias}
            onChange={setReavaliacaoDias}
            onApply={handleApplyReavaliacao}
            canApply={canEdit}
            applyState={applyState}
            helpText={`Ao aplicar, todos os alunos passam a ter o protocolo resetado a cada ${reavaliacaoDias || 0} dia(s) — mesmo campo usado em Configurações.`}
            lastAppliedText={lastAppliedText}
          />
        )}
      </div>

      {selectedLead && (
        <UserDetailModal user={buildUserDetail(selectedLead)} canEdit={canEdit} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  )
}
