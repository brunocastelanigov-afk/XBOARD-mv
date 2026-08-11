import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Crown,
  Lock,
  MessageSquare,
  PieChart,
  Star,
  TrendingDown,
  TrendingUp,
  Undo2,
  Users,
  Zap,
} from "lucide-react"

import { EmptyState } from "@/components/atoms/empty-state"
import { Skeleton } from "@/components/atoms/skeleton"
import { BarChartCard, type BarChartCardDatum } from "@/components/composites/bar-chart-card"
import { DonutChartCard, type DonutChartCardDatum } from "@/components/composites/donut-chart-card"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { StatTile, type StatTileTone } from "@/components/composites/stat-tile"

const AMBER = "#f59e0b"
const BLUE = "#3b82f6"
const PURPLE = "#a855f7"

interface DashboardMetrics {
  totalUsuarios: number
  totalTrinca: number
  totalElite: number
  reembolsos: number
  semAcesso: number
  freqMediaAlta: number
  freqMediaBaixa: number
}

const METRICS: DashboardMetrics = {
  totalUsuarios: 51867,
  totalTrinca: 48710,
  totalElite: 2468,
  reembolsos: 342,
  semAcesso: 1043,
  freqMediaAlta: 19977,
  freqMediaBaixa: 31890,
}

const METRIC_TILES: {
  label: string
  value: number
  icon: typeof Users
  tone: StatTileTone
}[] = [
  { label: "Total usuários", value: METRICS.totalUsuarios, icon: Users, tone: "blue" },
  { label: "Total Trinca", value: METRICS.totalTrinca, icon: Zap, tone: "blue" },
  { label: "Total Elite", value: METRICS.totalElite, icon: Crown, tone: "purple" },
  { label: "Reembolsos", value: METRICS.reembolsos, icon: Undo2, tone: "red" },
  { label: "Sem acesso", value: METRICS.semAcesso, icon: Lock, tone: "amber" },
  { label: "Freq. média alta", value: METRICS.freqMediaAlta, icon: TrendingUp, tone: "green" },
  { label: "Freq. média baixa", value: METRICS.freqMediaBaixa, icon: TrendingDown, tone: "red" },
]

const IDADE_DATA: DonutChartCardDatum[] = [
  { label: "13-20", value: 5023, color: BLUE },
  { label: "21-30", value: 18420, color: PURPLE },
  { label: "31-40", value: 16890, color: AMBER },
  { label: "41-50", value: 8340, color: "#22c55e" },
  { label: "51+", value: 3194, color: "#ef4444" },
]

const OBJETIVOS_DATA: BarChartCardDatum[] = [
  { label: "crescer_e_secar", value: 38000, color: AMBER },
  { label: "secar_muito", value: 4000, color: AMBER },
  { label: "Crescer e Secar", value: 3500, color: AMBER },
  { label: "Ganhar massa mu[scular]", value: 200, color: AMBER },
  { label: "Crescer", value: 100, color: AMBER },
]

const FREQUENCIA_DATA: BarChartCardDatum[] = [
  { label: "0 dias", value: 4210, color: BLUE },
  { label: "1 dia", value: 6870, color: BLUE },
  { label: "2 dias", value: 9930, color: BLUE },
  { label: "3 dias", value: 12480, color: BLUE },
  { label: "4 dias", value: 8760, color: BLUE },
  { label: "5 dias", value: 5340, color: BLUE },
  { label: "6 dias", value: 2690, color: BLUE },
  { label: "7 dias", value: 1587, color: BLUE },
]

interface RecentSuggestion {
  id: string
  nome: string
  email: string
  texto: string
}

const RECENT_SUGGESTIONS: RecentSuggestion[] = [
  {
    id: "sug-1",
    nome: "Eustáquio Cassemiro dos Santos",
    email: "eucasantos0@gmail.com",
    texto:
      "Estou precisando de ajuda. Fiz a compra com vocês dia 02ago26, e até hoje não tive acesso aos treinos.",
  },
  {
    id: "sug-2",
    nome: "Fm Moura",
    email: "fmmoura19@gmail.com",
    texto:
      "Gostei muito do aplicativo. Porém deixo aqui minha sugestão: deixar as conclusões dos treinos livres, sem obrigatoriedade de sequência.",
  },
  {
    id: "sug-3",
    nome: "Nixon Richard Gomes da Costa",
    email: "nixoncosta@gmail.com",
    texto: "Criar a opção de manter o celular ativo, sem precisar desbloquear a cada exercício.",
  },
]

interface RecentEvaluation {
  id: string
  nome: string
  treino: string
  nota: number
  comentario: string
}

const RECENT_EVALUATIONS: RecentEvaluation[] = [
  { id: "aval-1", nome: "Ana Paula Ferreira", treino: "Treino 1", nota: 6, comentario: "Treino pesado, mas gostei da progressão." },
  { id: "aval-2", nome: "Carlos Eduardo Souza", treino: "Treino 2", nota: 5, comentario: "Faltou explicação de execução em alguns exercícios." },
  { id: "aval-3", nome: "Bruna Martins", treino: "Treino 3", nota: 7, comentario: "Melhor treino do protocolo até agora." },
]

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />
}

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const idadeData = forceEmpty ? [] : IDADE_DATA
  const objetivosData = forceEmpty ? [] : OBJETIVOS_DATA
  const frequenciaData = forceEmpty ? [] : FREQUENCIA_DATA
  const suggestions = forceEmpty ? [] : RECENT_SUGGESTIONS
  const evaluations = forceEmpty ? [] : RECENT_EVALUATIONS

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader title="Dashboard" className="items-start" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: METRIC_TILES.length }, (_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))
            : METRIC_TILES.map((tile) => (
                <StatTile
                  key={tile.label}
                  label={tile.label}
                  value={tile.value.toLocaleString("pt-BR")}
                  icon={tile.icon}
                  tone={tile.tone}
                />
              ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isLoading ? (
            <ChartSkeleton />
          ) : idadeData.length === 0 ? (
            <EmptyState icon={PieChart} message="Nenhum dado de idade no período." />
          ) : (
            <DonutChartCard title="Distribuição de idade" data={idadeData} />
          )}
          {isLoading ? (
            <ChartSkeleton />
          ) : objetivosData.length === 0 ? (
            <EmptyState icon={TrendingUp} message="Nenhum dado de objetivo no período." />
          ) : (
            <BarChartCard title="Objetivos" data={objetivosData} orientation="horizontal" />
          )}
        </div>

        {isLoading ? (
          <ChartSkeleton />
        ) : frequenciaData.length === 0 ? (
          <EmptyState icon={TrendingUp} message="Nenhum dado de frequência no período." />
        ) : (
          <BarChartCard title="Frequência" data={frequenciaData} orientation="vertical" />
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <EntityListHeader title="Sugestões recentes" />
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <EmptyState icon={MessageSquare} message="Nenhuma sugestão recente." />
            ) : (
              suggestions.map((suggestion) => (
                <EntityCard key={suggestion.id} title={suggestion.nome} metadata={[suggestion.email]}>
                  <p className="text-sm text-muted-foreground">{suggestion.texto}</p>
                </EntityCard>
              ))
            )}
          </div>

          <div className="space-y-3">
            <EntityListHeader title="Avaliações recentes de treino" />
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : evaluations.length === 0 ? (
              <EmptyState icon={Star} message="Nenhuma avaliação recente." />
            ) : (
              evaluations.map((evaluation) => (
                <EntityCard
                  key={evaluation.id}
                  title={evaluation.nome}
                  badges={[{ label: `${evaluation.nota}★`, variant: "secondary" }]}
                  metadata={[evaluation.treino]}
                >
                  <p className="text-sm text-muted-foreground">{evaluation.comentario}</p>
                </EntityCard>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
