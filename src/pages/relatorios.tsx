import { useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  Calendar,
  Check,
  Crown,
  MessageSquare,
  PieChart,
  Star,
  ThumbsUp,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

import { EmptyState } from "@/components/atoms/empty-state"
import { ProgressListItem } from "@/components/atoms/progress-list-item"
import { Skeleton } from "@/components/atoms/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Badge } from "@/components/atoms/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { BarChartCard, type BarChartCardDatum } from "@/components/composites/bar-chart-card"
import { DonutChartCard, type DonutChartCardDatum } from "@/components/composites/donut-chart-card"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { StatTile } from "@/components/composites/stat-tile"

const AMBER = "#f59e0b"
const BLUE = "#3b82f6"
const PURPLE = "#a855f7"

interface OverviewMetrics {
  totalAlunos: number
  avaliacaoMedia: string
  freqMedia: string
  sugestoes: number
  elite: number
  trinca: number
}

const OVERVIEW_METRICS: OverviewMetrics = {
  totalAlunos: 51867,
  avaliacaoMedia: "6.0",
  freqMedia: "1.2%",
  sugestoes: 16,
  elite: 2468,
  trinca: 48710,
}

const OBJETIVOS_DATA: BarChartCardDatum[] = [
  { label: "crescer_e_secar", value: 38000, color: AMBER },
  { label: "secar_muito", value: 4000, color: AMBER },
  { label: "Crescer e Secar", value: 3500, color: AMBER },
  { label: "Ganhar massa mu[scular]", value: 200, color: AMBER },
  { label: "Crescer", value: 100, color: AMBER },
]

const SEXO_DATA: DonutChartCardDatum[] = [
  { label: "Homens", value: 3459, color: BLUE },
  { label: "Mulheres", value: 190, color: PURPLE },
]

interface UsersMetrics {
  homens: number
  mulheres: number
  idadeMedia: string
  freqMedia: string
}

const USERS_METRICS: UsersMetrics = {
  homens: 3459,
  mulheres: 190,
  idadeMedia: "40.8 anos",
  freqMedia: "1.2%",
}

const FAIXAS_ETARIAS_DATA: BarChartCardDatum[] = [
  { label: "13-20", value: 50000, color: AMBER },
  { label: "21-30", value: 38000, color: AMBER },
  { label: "31-40", value: 800, color: AMBER },
  { label: "41-50", value: 600, color: AMBER },
  { label: "51+", value: 400, color: AMBER },
]

interface CategoriaAluno {
  label: string
  value: number
}

const CATEGORIAS_ALUNOS: CategoriaAluno[] = [
  { label: "advanced", value: 1 },
  { label: "Muito acima do peso", value: 96 },
  { label: "Médio", value: 110 },
  { label: "Magro(a) com barriga", value: 63 },
  { label: "Acima do peso", value: 200 },
  { label: "Muito magro(a)", value: 1 },
  { label: "Magro(a)", value: 20 },
  { label: "Musculoso(a)", value: 5 },
  { label: "Definição", value: 1 },
  { label: "Emagrecimento Adulto", value: 1 },
]

const CATEGORIAS_MAX = Math.max(...CATEGORIAS_ALUNOS.map((item) => item.value))

interface EvaluationsMetrics {
  totalAvaliacoes: number
  mediaGeral: string
  feedbacksNegativos: number
  positivos: number
}

const EVALUATIONS_METRICS: EvaluationsMetrics = {
  totalAvaliacoes: 200,
  mediaGeral: "6.0",
  feedbacksNegativos: 0,
  positivos: 200,
}

const NOTAS_DATA: BarChartCardDatum[] = [
  { label: "1★", value: 0, color: AMBER },
  { label: "2★", value: 0, color: AMBER },
  { label: "3★", value: 0, color: AMBER },
  { label: "4★", value: 0, color: AMBER },
  { label: "5★", value: 145, color: AMBER },
  { label: "6★", value: 5, color: AMBER },
  { label: "7★", value: 8, color: AMBER },
  { label: "8★", value: 20, color: AMBER },
  { label: "9★", value: 7, color: AMBER },
  { label: "10★", value: 15, color: AMBER },
]

interface NotaPorTreino {
  id: string
  nome: string
  nota: string
  contagem: number
}

const NOTAS_POR_TREINO: NotaPorTreino[] = [
  { id: "treino-1", nome: "Treino 1", nota: "6.0★", contagem: 121 },
  { id: "treino-2", nome: "Treino 2", nota: "5.9★", contagem: 38 },
  { id: "treino-3", nome: "Treino 3", nota: "5.8★", contagem: 41 },
]

interface SuggestionsMetrics {
  total: number
  novas: number
  implementadas: number
}

const SUGGESTIONS_METRICS: SuggestionsMetrics = {
  total: 16,
  novas: 16,
  implementadas: 0,
}

type SuggestionStatus = "nova" | "revisada" | "implementada"

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  nova: "Nova",
  revisada: "Revisada",
  implementada: "Implementada",
}

interface Suggestion {
  id: string
  nome: string
  email: string
  texto: string
  status: SuggestionStatus
}

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: "sug-1",
    nome: "Eustáquio Cassemiro dos Santos",
    email: "eucasantos0@gmail.com",
    texto:
      "Estou precisando de ajuda Fiz a compra com vocês dia 02ago26, e até hoje não tive acesso aos treinos. Envio mensagem no watssap e não estou tendo resposta",
    status: "nova",
  },
  {
    id: "sug-2",
    nome: "Fm Moura",
    email: "fmmoura19@gmail.com",
    texto:
      "Gostei muito do aplicativo. Porém deixo aqui minha sugestão. Poderia deixar as conclusões dos treinos livres, sem a obrigatoriedade de seguir a sequência. Quase sempre não conseguimos seguir essa sequência na academia.",
    status: "nova",
  },
  {
    id: "sug-3",
    nome: "Nixon Richard Gomes da Costa",
    email: "nixoncosta@gmail.com",
    texto: "Criar a opção de manter o celular ativo nao sendo necessário toda vez ficar desbloqueado",
    status: "nova",
  },
  {
    id: "sug-4",
    nome: "Nixon Richard Gomes da Costa",
    email: "nixoncosta@gmail.com",
    texto:
      "No app na parte superior apresentar o próximo exercício que será feito para qdo estiver em descanso ir preparando para a próxima fase",
    status: "nova",
  },
  {
    id: "sug-5",
    nome: "Brunodev3007",
    email: "brunodev3007@gmail.com",
    texto: "aa",
    status: "nova",
  },
  {
    id: "sug-6",
    nome: "Brunodev3007",
    email: "brunodev3007@gmail.com",
    texto: "Teste de auditoria - conta nao-elite",
    status: "nova",
  },
  {
    id: "sug-7",
    nome: "Brunodev",
    email: "brunodev@lotz44.com",
    texto: "Teste de auditoria - planejamento de arquitetura backend",
    status: "nova",
  },
]

function StatTileGrid({
  columns,
  loading,
  children,
}: {
  columns: number
  loading: boolean
  children: ReactNode
}) {
  const gridClass =
    columns === 6
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : columns === 4
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      : "grid grid-cols-1 gap-4 sm:grid-cols-3"

  if (loading) {
    const count = columns
    return (
      <div className={gridClass}>
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return <div className={gridClass}>{children}</div>
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />
}

interface RelatoriosPageProps {
  canEdit?: boolean
}

export function RelatoriosPage({ canEdit: canEditProp }: RelatoriosPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [activeTab, setActiveTab] = useState("visao-geral")
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS)

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  function handleTabChange(value: string) {
    setActiveTab(value)
    if (forceLoading) return
    setLoading(true)
    const timeout = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timeout)
  }

  function updateSuggestionStatus(id: string, status: SuggestionStatus) {
    setSuggestions((current) =>
      current.map((suggestion) => (suggestion.id === id ? { ...suggestion, status } : suggestion))
    )
  }

  const isLoading = forceLoading || loading
  const objetivosData = forceEmpty ? [] : OBJETIVOS_DATA
  const sexoData = forceEmpty ? [] : SEXO_DATA
  const faixasEtariasData = forceEmpty ? [] : FAIXAS_ETARIAS_DATA
  const categoriasAlunos = forceEmpty ? [] : CATEGORIAS_ALUNOS
  const notasData = forceEmpty ? [] : NOTAS_DATA
  const notasPorTreino = forceEmpty ? [] : NOTAS_POR_TREINO
  const suggestionList = forceEmpty ? [] : suggestions

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader title="Relatórios" className="items-start" />
        <p className="-mt-4 text-sm text-muted-foreground">Análise completa do sistema</p>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="sticky top-0 z-10">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
            <TabsTrigger value="sugestoes">Sugestões</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="space-y-4">
            <StatTileGrid columns={6} loading={isLoading}>
              <StatTile label="Total alunos" value={OVERVIEW_METRICS.totalAlunos} icon={Users} tone="blue" />
              <StatTile
                label="Avaliação média"
                value={`${OVERVIEW_METRICS.avaliacaoMedia}★`}
                icon={Star}
                tone="amber"
              />
              <StatTile
                label="Freq. média"
                value={OVERVIEW_METRICS.freqMedia}
                icon={TrendingUp}
                tone="green"
              />
              <StatTile
                label="Sugestões"
                value={OVERVIEW_METRICS.sugestoes}
                icon={MessageSquare}
                tone="blue"
              />
              <StatTile label="Elite" value={OVERVIEW_METRICS.elite} icon={Crown} tone="purple" />
              <StatTile label="Trinca" value={OVERVIEW_METRICS.trinca} icon={Zap} tone="blue" />
            </StatTileGrid>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {isLoading ? (
                <ChartSkeleton />
              ) : objetivosData.length === 0 ? (
                <EmptyState icon={TrendingUp} message="Nenhum dado de objetivo no recorte atual." />
              ) : (
                <BarChartCard title="Objetivos" data={objetivosData} orientation="horizontal" />
              )}
              {isLoading ? (
                <ChartSkeleton />
              ) : sexoData.length === 0 ? (
                <EmptyState icon={PieChart} message="Nenhum dado de sexo no recorte atual." />
              ) : (
                <DonutChartCard title="Distribuição de Sexo" data={sexoData} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <StatTileGrid columns={4} loading={isLoading}>
              <StatTile label="Homens" value={USERS_METRICS.homens} icon={Users} tone="blue" />
              <StatTile label="Mulheres" value={USERS_METRICS.mulheres} icon={Users} tone="purple" />
              <StatTile label="Idade média" value={USERS_METRICS.idadeMedia} icon={Calendar} tone="amber" />
              <StatTile label="Freq. média" value={USERS_METRICS.freqMedia} icon={TrendingUp} tone="green" />
            </StatTileGrid>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {isLoading ? (
                <ChartSkeleton />
              ) : faixasEtariasData.length === 0 ? (
                <EmptyState icon={TrendingUp} message="Nenhum dado de faixa etária no recorte atual." />
              ) : (
                <BarChartCard title="Faixas etárias" data={faixasEtariasData} orientation="vertical" />
              )}

              {isLoading ? (
                <ChartSkeleton />
              ) : categoriasAlunos.length === 0 ? (
                <EmptyState icon={Users} message="Nenhuma categoria de aluno no recorte atual." />
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                  <h3 className="text-sm font-medium">Categorias de Alunos</h3>
                  <div className="space-y-3">
                    {categoriasAlunos.map((item) => (
                      <ProgressListItem
                        key={item.label}
                        label={item.label}
                        value={item.value}
                        percent={(item.value / CATEGORIAS_MAX) * 100}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="avaliacoes" className="space-y-4">
            <StatTileGrid columns={4} loading={isLoading}>
              <StatTile
                label="Total avaliações"
                value={EVALUATIONS_METRICS.totalAvaliacoes}
                icon={Star}
                tone="amber"
              />
              <StatTile
                label="Média geral"
                value={`${EVALUATIONS_METRICS.mediaGeral}★`}
                icon={Star}
                tone="amber"
              />
              <StatTile
                label="Feedbacks negativos"
                value={EVALUATIONS_METRICS.feedbacksNegativos}
                icon={AlertTriangle}
                tone="red"
              />
              <StatTile
                label="Positivos (4-5★)"
                value={EVALUATIONS_METRICS.positivos}
                icon={ThumbsUp}
                tone="green"
              />
            </StatTileGrid>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {isLoading ? (
                <ChartSkeleton />
              ) : notasData.length === 0 ? (
                <EmptyState icon={Star} message="Nenhuma nota registrada no recorte atual." />
              ) : (
                <BarChartCard title="Distribuição de notas" data={notasData} orientation="vertical" />
              )}

              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-medium">Feedbacks negativos (nota &lt; 3)</h3>
                  <EmptyState icon={AlertTriangle} message="Nenhum feedback negativo" />
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : notasPorTreino.length === 0 ? (
              <EmptyState icon={Star} message="Nenhum treino avaliado no recorte atual." />
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Notas por treino</h3>
                {notasPorTreino.map((treino) => (
                  <EntityCard
                    key={treino.id}
                    title={treino.nome}
                    badges={[{ label: treino.nota, variant: "secondary" }]}
                    metadata={[`${treino.contagem} avaliação(ões)`]}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sugestoes" className="space-y-4">
            <StatTileGrid columns={3} loading={isLoading}>
              <StatTile
                label="Total"
                value={SUGGESTIONS_METRICS.total}
                icon={MessageSquare}
                tone="blue"
              />
              <StatTile label="Novas" value={SUGGESTIONS_METRICS.novas} icon={MessageSquare} tone="blue" />
              <StatTile
                label="Implementadas"
                value={SUGGESTIONS_METRICS.implementadas}
                icon={Check}
                tone="green"
              />
            </StatTileGrid>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : suggestionList.length === 0 ? (
              <EmptyState icon={MessageSquare} message="Nenhuma sugestão registrada no recorte atual." />
            ) : (
              <div className="space-y-3">
                {suggestionList.map((suggestion) => (
                  <EntityCard
                    key={suggestion.id}
                    title={suggestion.nome}
                    metadata={[suggestion.email]}
                    badges={[{ label: STATUS_LABEL[suggestion.status], variant: "secondary" }]}
                  >
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{suggestion.texto}</p>
                      {canEdit ? (
                        <Select
                          value={suggestion.status}
                          onValueChange={(value) =>
                            updateSuggestionStatus(suggestion.id, value as SuggestionStatus)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nova">Nova</SelectItem>
                            <SelectItem value="revisada">Revisada</SelectItem>
                            <SelectItem value="implementada">Implementada</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{STATUS_LABEL[suggestion.status]}</Badge>
                      )}
                    </div>
                  </EntityCard>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
