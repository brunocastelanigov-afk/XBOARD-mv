import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  Eye,
  EyeOff,
  FileQuestion,
  Hash,
  Image as ImageIcon,
  Info,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Timer,
  TrendingDown,
  Type as TypeIcon,
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
import { StatusIcon } from "@/components/atoms/status-icon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { BarChartCard, type BarChartCardDatum } from "@/components/composites/bar-chart-card"
import { ChartCard } from "@/components/composites/chart-card"
import { DonutChartCard, type DonutChartCardDatum } from "@/components/composites/donut-chart-card"
import { DrilldownQuestionCard } from "@/components/composites/drilldown-question-card"
import { EntityCard, type EntityCardBadge } from "@/components/composites/entity-card"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { PeriodFilterBar, type PeriodFilterRange } from "@/components/composites/period-filter-bar"
import { StatTile } from "@/components/composites/stat-tile"
import { UserDetailModal, type UserDetail } from "@/components/composites/user-detail-modal"

// ————————————————————————————————————————————————————————————————————
// Tipos de nível de navegação
// ————————————————————————————————————————————————————————————————————
type TopTab = "quiz" | "respostas"
type QuizSubTab = "inicio" | "reavaliacao" | "especiais"
type RespostasSubTab = "por-usuario" | "por-pergunta" | "relatorios"
type RelatorioSubTab = "visao-geral" | "quiz-inicial" | "relatorio-avaliacao"

const ALL = "__all__"

// ————————————————————————————————————————————————————————————————————
// Região C/D — Quiz (leitura; edição de quiz é pós-MVP, CRUD oculto)
// ————————————————————————————————————————————————————————————————————
type QuestionType = "Escolha única" | "Número" | "Múltipla escolha" | "Texto livre"

interface QuizQuestion {
  id: string
  ordem: number
  texto: string
  tipo: QuestionType
  opcoes?: number
  autoAvanco?: boolean
}

const QUESTION_TYPE_ICON: Record<QuestionType, typeof Hash> = {
  "Escolha única": ListChecks,
  Número: Hash,
  "Múltipla escolha": ListChecks,
  "Texto livre": TypeIcon,
}

// Nota: só as 7 perguntas abaixo estão confirmadas em texto no Passo 00 (docs/admin-crm-expansion-passo-00.md,
// seção P05). O contador "23" no header/badge é o valor real confirmado no print quiz/19.29.37 — as 16
// perguntas restantes não foram transcritas no levantamento e não são inventadas aqui.
const QUIZ_INICIO_QUESTIONS: QuizQuestion[] = [
  { id: "qi-1", ordem: 1, texto: "Qual é o seu gênero?", tipo: "Escolha única", opcoes: 2, autoAvanco: true },
  { id: "qi-2", ordem: 2, texto: "Qual é a sua idade?", tipo: "Número" },
  { id: "qi-3", ordem: 3, texto: "Qual é a sua altura?", tipo: "Número" },
  { id: "qi-4", ordem: 4, texto: "Qual é o seu peso atual?", tipo: "Número" },
  { id: "qi-5", ordem: 5, texto: "Como está sua composição corporal hoje?", tipo: "Escolha única", opcoes: 7, autoAvanco: true },
  { id: "qi-6", ordem: 6, texto: "Qual é a sua experiência com academia?", tipo: "Escolha única", opcoes: 3, autoAvanco: true },
  { id: "qi-7", ordem: 7, texto: "Está treinando atualmente?", tipo: "Escolha única", opcoes: 2 },
]

// Nota: só as 6 perguntas abaixo estão confirmadas em texto no Passo 00. Badge "16" é o valor real do print.
const QUIZ_REAVALIACAO_QUESTIONS: QuizQuestion[] = [
  { id: "qr-1", ordem: 1, texto: "Como você avalia sua evolução física desde o início dos treinos?", tipo: "Escolha única", opcoes: 4, autoAvanco: true },
  { id: "qr-2", ordem: 2, texto: "De 0 a 10, qual nota você dá para os treinos que realizou?", tipo: "Número" },
  { id: "qr-3", ordem: 3, texto: "Você sentiu alguma dor muscular intensa durante os treinos?", tipo: "Escolha única", opcoes: 4, autoAvanco: true },
  { id: "qr-4", ordem: 4, texto: "Qual região do corpo você sentiu mais dor ou desconforto ao treinar?", tipo: "Múltipla escolha", opcoes: 8 },
  { id: "qr-5", ordem: 5, texto: "Com que frequência você conseguiu treinar nas últimas semanas?", tipo: "Escolha única", opcoes: 5, autoAvanco: true },
  { id: "qr-6", ordem: 6, texto: "O que mais te impediu de treinar com a frequência que queria?", tipo: "Texto livre" },
]

// Helpers de skeleton compartilhados por todas as sub-views — nav (A/B/C/O/X) nunca entra em
// skeleton, só stat-tile/gráficos/listas (conforme docs/admin-crm-expansion-passo-01-wireframes.md, P05).
function StatGridSkeleton({ columns }: { columns: number }) {
  const gridClass =
    columns >= 5
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      : columns === 4
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

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />
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

function questionBadges(question: QuizQuestion): EntityCardBadge[] {
  const badges: EntityCardBadge[] = [{ label: question.tipo, variant: "outline" }]
  if (question.opcoes) badges.push({ label: `${question.opcoes} opções`, variant: "outline" })
  if (question.autoAvanco) {
    badges.push({
      label: "Auto-avanço",
      variant: "outline",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    })
  }
  return badges
}

function QuizQuestionList({
  questions,
  showVisibilityToggle,
  loading,
}: {
  questions: QuizQuestion[]
  showVisibilityToggle: boolean
  loading: boolean
}) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(
    () => Object.fromEntries(questions.map((question) => [question.id, true]))
  )

  if (loading) return <ListSkeleton rows={4} />

  if (questions.length === 0) {
    return <EmptyState icon={FileQuestion} message="Nenhuma pergunta cadastrada." />
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((question) => {
        const Icon = QUESTION_TYPE_ICON[question.tipo]
        const visible = visibility[question.id] ?? true
        return (
          <EntityCard
            key={question.id}
            icon={Icon}
            title={`${question.ordem}. ${question.texto}`}
            badges={questionBadges(question)}
            actions={
              showVisibilityToggle
                ? [
                    {
                      icon: visible ? Eye : EyeOff,
                      label: visible ? "Ocultar pergunta" : "Exibir pergunta",
                      onClick: () =>
                        setVisibility((prev) => ({ ...prev, [question.id]: !visible })),
                    },
                  ]
                : undefined
            }
          />
        )
      })}
      <p className="text-xs text-muted-foreground">
        Demais perguntas do contador acima não foram capturadas nos prints auditados — só as
        confirmadas em texto aparecem na lista.
      </p>
    </div>
  )
}

function PaginasEspeciaisView({ loading }: { loading: boolean }) {
  if (loading) return <ListSkeleton rows={2} />

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Páginas especiais aparecem entre as perguntas do quiz e têm um botão "Continuar".
            Defina a posição (ordem) para controlar em qual ponto do quiz ela aparece.
          </p>
        </CardContent>
      </Card>
      <EntityCard
        title="Você não está sozinho nessa jornada!"
        badges={[
          { label: "5.5", variant: "secondary" },
          { label: "Tem copy/texto", variant: "outline" },
          { label: "Botão: 'Continuar'", variant: "outline" },
          { label: "Tem imagem", variant: "outline" },
          { label: "Padrão do quiz", variant: "outline" },
        ]}
      >
        <p className="text-sm italic text-muted-foreground">
          "2.184 alunos como você já transformaram suas vidas com o Desafio Treino Trinca..."
        </p>
      </EntityCard>
    </div>
  )
}

function QuizManagementView({ loading }: { loading: boolean }) {
  const [subTab, setSubTab] = useState<QuizSubTab>("inicio")

  return (
    <Tabs value={subTab} onValueChange={(value) => setSubTab(value as QuizSubTab)}>
      <TabsList className="sticky top-0 z-10">
        <TabsTrigger value="inicio" className="gap-1.5">
          Quiz Início
          <Badge variant="secondary">{QUIZ_INICIO_QUESTIONS.length > 0 ? 23 : 0}</Badge>
        </TabsTrigger>
        <TabsTrigger value="reavaliacao" className="gap-1.5">
          Quiz Reavaliação
          <Badge variant="secondary">16</Badge>
        </TabsTrigger>
        <TabsTrigger value="especiais" className="gap-1.5">
          Páginas Especiais
          <Badge variant="secondary">1</Badge>
        </TabsTrigger>
        {/* "Página de Fim" fica oculta nesta rodada — 100% CRUD de edição, pós-MVP. */}
      </TabsList>

      <TabsContent value="inicio" className="mt-4">
        <QuizQuestionList questions={QUIZ_INICIO_QUESTIONS} showVisibilityToggle loading={loading} />
      </TabsContent>
      <TabsContent value="reavaliacao" className="mt-4">
        <QuizQuestionList questions={QUIZ_REAVALIACAO_QUESTIONS} showVisibilityToggle={false} loading={loading} />
      </TabsContent>
      <TabsContent value="especiais" className="mt-4">
        <PaginasEspeciaisView loading={loading} />
      </TabsContent>
    </Tabs>
  )
}

// ————————————————————————————————————————————————————————————————————
// Região O/P/Q — Respostas de Avaliação › Por Usuário
// ————————————————————————————————————————————————————————————————————
interface RespostaUsuario {
  id: string
  nome: string
  email: string
  status: "pending" | "done"
  idade: number
  sexo: string
  peso: number
  altura: number
  tagExperiencia: string
  tagDor?: string
  dataHora: string
}

const RESPOSTAS_USUARIOS: RespostaUsuario[] = [
  { id: "u1", nome: "Ana Paula Ferreira", email: "ana.ferreira@email.com", status: "done", idade: 32, sexo: "Mulher", peso: 64, altura: 165, tagExperiencia: "Intermediário", dataHora: "10/08/2026, 14:22" },
  { id: "u2", nome: "Carlos Eduardo Souza", email: "carlos.souza@email.com", status: "done", idade: 27, sexo: "Homem", peso: 82, altura: 178, tagExperiencia: "Experiente - Mais de 1 ano treinando", tagDor: "Com dor", dataHora: "10/08/2026, 09:10" },
  { id: "u3", nome: "Bruna Martins", email: "bruna.martins@email.com", status: "pending", idade: 41, sexo: "Mulher", peso: 71, altura: 168, tagExperiencia: "Iniciante", dataHora: "09/08/2026, 20:47" },
  { id: "u4", nome: "Diego Ramos", email: "diego.ramos@email.com", status: "done", idade: 35, sexo: "Homem", peso: 79, altura: 175, tagExperiencia: "Intermediário", tagDor: "Com dor", dataHora: "09/08/2026, 18:03" },
  { id: "u5", nome: "Fernanda Lima", email: "fernanda.lima@email.com", status: "pending", idade: 29, sexo: "Mulher", peso: 68, altura: 170, tagExperiencia: "Experiente - Mais de 1 ano treinando", dataHora: "08/08/2026, 11:55" },
]

const EXPERIENCIA_OPTIONS = ["Iniciante", "Intermediário", "Experiente - Mais de 1 ano treinando"]

function buildRespostaUsuarioDetail(resposta: RespostaUsuario): UserDetail {
  return {
    id: resposta.id,
    name: resposta.nome,
    email: resposta.email,
    topStatus: null,
    protocolo: { liberado: true, mensagem: "Disponível para treinar agora", detalhe: "Treino Experiente - Para Crescer e Secar · 3 dias de treino" },
    perfilFisico: { idade: resposta.idade, sexo: resposta.sexo, peso: resposta.peso, altura: resposta.altura, categoria: resposta.tagExperiencia },
    acessoGestao: { plano: "trinca", cargo: "aluno", status: "Ativo", acesso: "Criado", compra: "Pendente", assinatura: "Vencido" },
    avaliacao: { avaliacaoInicial: resposta.status === "done" ? "Concluída" : "Pendente", cardVisualizado: false, objetivo: undefined },
    treinos: { frequenciaLabel: "—", frequenciaPercent: 0 },
    reavaliacao: { definida: false },
    cargas: [],
    quiz: {
      nome: "Quiz inicial",
      concluidoEm: resposta.dataHora,
      respostas: [
        { pergunta: "Qual é o seu gênero?", resposta: resposta.sexo },
        { pergunta: "Qual é a sua idade?", resposta: String(resposta.idade) },
        { pergunta: "Qual é a sua experiência com academia?", resposta: resposta.tagExperiencia },
      ],
    },
  }
}

function PorUsuarioView({ canEdit, loading }: { canEdit: boolean; loading: boolean }) {
  const [search, setSearch] = useState("")
  const [experiencia, setExperiencia] = useState(ALL)
  const [selected, setSelected] = useState<RespostaUsuario | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return RESPOSTAS_USUARIOS.filter((resposta) => {
      if (term && !resposta.nome.toLowerCase().includes(term) && !resposta.email.toLowerCase().includes(term)) {
        return false
      }
      if (experiencia !== ALL && resposta.tagExperiencia !== experiencia) return false
      return true
    })
  }, [search, experiencia])

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            placeholder="Buscar por nome, e-mail, pergunta ou resposta..."
            value={search}
            onChange={setSearch}
            className="w-full lg:w-[300px]"
          />
          <Select value={experiencia} onValueChange={setExperiencia}>
            <SelectTrigger className="w-full lg:w-[220px]">
              <SelectValue placeholder="Filtros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas experiências</SelectItem>
              {EXPERIENCIA_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Mostrando {filtered.length} de {RESPOSTAS_USUARIOS.length}
        </span>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} message="Nenhuma resposta encontrada para os filtros aplicados." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((resposta) => (
            <EntityCard
              key={resposta.id}
              title={resposta.nome}
              metadata={[resposta.email, resposta.dataHora]}
              badges={[
                { label: `${resposta.idade} anos`, variant: "outline" },
                { label: resposta.sexo, variant: "outline" },
                {
                  label: resposta.tagExperiencia,
                  variant: "outline",
                  className: "border-amber-500/30 bg-amber-500/10 text-amber-600",
                },
                ...(resposta.tagDor
                  ? [{ label: resposta.tagDor, variant: "outline" as const, className: "border-red-500/30 bg-red-500/10 text-red-600" }]
                  : []),
              ]}
              actions={[]}
            >
              <div className="flex items-center justify-between">
                <StatusIcon status={resposta.status === "done" ? "done" : "pending"} size="sm" />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setSelected(resposta)}>
                  <Eye className="size-3.5" />
                  Ver respostas
                </Button>
              </div>
            </EntityCard>
          ))}
        </div>
      )}

      {selected && (
        <UserDetailModal
          user={buildRespostaUsuarioDetail(selected)}
          canEdit={canEdit}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ————————————————————————————————————————————————————————————————————
// Região R/S/T/U/V/W — Respostas de Avaliação › Por Pergunta
// ————————————————————————————————————————————————————————————————————
interface PerguntaResumo {
  id: string
  numero: number
  texto: string
  tipo: QuestionType
  respondentes: number
}

const PERGUNTAS_RESUMO: PerguntaResumo[] = [
  { id: "p1", numero: 1, texto: "Qual é o seu gênero?", tipo: "Escolha única", respondentes: 2395 },
  { id: "p2", numero: 5, texto: "Como está sua composição corporal hoje?", tipo: "Escolha única", respondentes: 2201 },
  { id: "p3", numero: 4, texto: "Qual região do corpo você sentiu mais dor ou desconforto ao treinar?", tipo: "Múltipla escolha", respondentes: 1874 },
  { id: "p4", numero: 6, texto: "O que mais te impediu de treinar com a frequência que queria?", tipo: "Texto livre", respondentes: 940 },
]

const GENERO_DONUT: DonutChartCardDatum[] = [
  { label: "Homem", value: 967, color: "#3b82f6" },
  { label: "Mulher", value: 1428, color: "#ec4899" },
]

const GENERO_RESPONDENTES = {
  Homem: ["carlos.souza@email.com", "diego.ramos@email.com"],
  Mulher: ["ana.ferreira@email.com", "bruna.martins@email.com", "fernanda.lima@email.com"],
}

function PorPerguntaView({ loading }: { loading: boolean }) {
  const [search, setSearch] = useState("")
  const [tipo, setTipo] = useState(ALL)
  const [selected, setSelected] = useState<PerguntaResumo | null>(null)
  const [respostaSearch, setRespostaSearch] = useState("")

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return PERGUNTAS_RESUMO.filter((pergunta) => {
      if (term && !pergunta.texto.toLowerCase().includes(term)) return false
      if (tipo !== ALL && pergunta.tipo !== tipo) return false
      return true
    })
  }, [search, tipo])

  if (selected) {
    const total = GENERO_DONUT.reduce((sum, item) => sum + item.value, 0)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Voltar" onClick={() => setSelected(null)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">Pergunta {selected.numero}</p>
            <h4 className="font-semibold">{selected.texto}</h4>
            <p className="text-xs text-muted-foreground">{selected.respondentes} respostas coletadas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DonutChartCard title="Distribuição" data={GENERO_DONUT} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contagem por opção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {GENERO_DONUT.map((item) => (
                <ProgressListItem
                  key={item.label}
                  label={item.label}
                  value={`${item.value} (${Math.round((item.value / total) * 100)}%)`}
                  percent={Math.round((item.value / total) * 100)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              placeholder="Buscar por usuário ou resposta..."
              value={respostaSearch}
              onChange={setRespostaSearch}
              className="w-full lg:w-[260px]"
            />
            <Select value={ALL} onValueChange={() => {}}>
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{total} respostas</span>
        </div>

        <div className="flex flex-col gap-3">
          {GENERO_DONUT.map((item) => {
            const emails = GENERO_RESPONDENTES[item.label as keyof typeof GENERO_RESPONDENTES] ?? []
            const filteredEmails = emails.filter((email) =>
              email.toLowerCase().includes(respostaSearch.trim().toLowerCase())
            )
            return (
              <EntityCard
                key={item.label}
                title={item.label}
                icon={undefined}
                badges={[
                  { label: `${filteredEmails.length} aluno(s)`, variant: "outline" },
                  { label: `${Math.round((item.value / total) * 100)}%`, variant: "secondary" },
                ]}
                expandable
                titleClassName="flex items-center gap-2 before:size-2.5 before:shrink-0 before:rounded-full"
              >
                {filteredEmails.length === 0 ? (
                  <EmptyState icon={Users} message="Nenhum aluno encontrado." />
                ) : (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {filteredEmails.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                )}
              </EntityCard>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <StatGridSkeleton columns={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total de perguntas" value={22} icon={FileQuestion} tone="blue" />
          <StatTile label="Única escolha" value={7} icon={ListChecks} tone="green" />
          <StatTile label="Múltipla escolha" value={9} icon={ListChecks} tone="purple" />
          <StatTile label="Texto livre" value={3} icon={TypeIcon} tone="amber" />
        </div>
      )}

      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center">
        <SearchInput
          placeholder="Buscar pergunta..."
          value={search}
          onChange={setSearch}
          className="w-full lg:w-[280px]"
        />
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {(["Escolha única", "Número", "Múltipla escolha", "Texto livre"] as QuestionType[]).map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
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
          {filtered.map((pergunta) => (
            <div
              key={pergunta.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setSelected(pergunta)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelected(pergunta)
              }}
            >
              <DrilldownQuestionCard
                index={pergunta.numero}
                question={pergunta.texto}
                type={pergunta.tipo}
                respondedCount={pergunta.respondentes}
                arrivalPercent={Math.round((pergunta.respondentes / 2395) * 100)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ————————————————————————————————————————————————————————————————————
// Região X/Y/Z/AA — Respostas de Avaliação › Relatórios
// ————————————————————————————————————————————————————————————————————
const PERFIL_FINANCEIRO_DATA: BarChartCardDatum[] = [
  { label: "Até R$ 500", value: 412, color: "#3b82f6" },
  { label: "R$ 500 – R$ 1.000", value: 318, color: "#3b82f6" },
  { label: "Acima de R$ 3.000", value: 190, color: "#3b82f6" },
]

const OBJETIVOS_DATA: BarChartCardDatum[] = [
  { label: "Crescer", value: 780, color: "#a855f7" },
  { label: "Secar Muito", value: 640, color: "#a855f7" },
  { label: "Crescer e Secar", value: 975, color: "#a855f7" },
]

const EXPERIENCIA_DATA: BarChartCardDatum[] = [
  { label: "Iniciante", value: 1204, color: "#f59e0b" },
  { label: "Experiente", value: 1191, color: "#f59e0b" },
]

const PLANOS_DATA: BarChartCardDatum[] = [
  { label: "TRINCA", value: 48710, color: "#3b82f6" },
  { label: "ELITE", value: 2468, color: "#a855f7" },
]

const ULTIMAS_RESPOSTAS = [
  { email: "helena.costa@email.com", respostas: 12, status: "Concluído", timestamp: "2026-08-10T22:14:03Z" },
  { email: "igor.almeida@email.com", respostas: 4, status: "Incompleto", timestamp: "2026-08-10T21:58:41Z" },
  { email: "juliana.rocha@email.com", respostas: 12, status: "Concluído", timestamp: "2026-08-10T20:03:12Z" },
]

// Nota: estrutura confirmada no Passo 00 (barra "onde as pessoas desistiram" por pergunta),
// valores por pergunta não estão nos prints — mock ilustrativo consistente com Iniciaram 117 / Completaram 64.
const DESISTENCIA_POR_PERGUNTA: BarChartCardDatum[] = [
  { label: "q1", value: 3, color: "#ef4444" },
  { label: "q2", value: 5, color: "#ef4444" },
  { label: "q4", value: 21, color: "#ef4444" },
  { label: "q6", value: 14, color: "#ef4444" },
  { label: "q9", value: 10, color: "#ef4444" },
]

interface AnalisePergunta {
  numero: string
  texto: string
  tipo: string
  responderam: number
  chegaramPercent: number
  tempoMedio: string
  alert?: string
}

const ANALISE_PERGUNTAS: AnalisePergunta[] = [
  { numero: "1", texto: "Qual é o seu gênero?", tipo: "single_choice", responderam: 117, chegaramPercent: 100, tempoMedio: "8s" },
  { numero: "2", texto: "Qual é a sua idade?", tipo: "number", responderam: 114, chegaramPercent: 97, tempoMedio: "11s" },
  { numero: "13.5", texto: "Você não está sozinho nessa jornada!", tipo: "single_choice", responderam: 96, chegaramPercent: 82, tempoMedio: "34s", alert: "⚠ 21 desistiram aqui" },
  { numero: "14.2", texto: "Qual é a sua urgência para melhorar seu físico?", tipo: "single_choice", responderam: 79, chegaramPercent: 68, tempoMedio: "19s" },
]

function VisaoGeralView({ loading }: { loading: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Resumo completo do quiz</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Iniciaram" value={1038} icon={Users} tone="blue" />
          <StatTile label="Concluíram" value={843} icon={BadgeCheck} tone="green" description="81% conclusão" />
          <StatTile label="Desistiram" value={195} icon={TrendingDown} tone="red" />
          <StatTile label="Tempo médio" value="13s" icon={Timer} tone="amber" description="por pergunta" />
          <StatTile label="Respostas rastreadas" value={2395} icon={MessageSquareText} tone="blue" />
          <StatTile label="Responderam suplementos" value={0} icon={FileQuestion} tone="purple" />
          <StatTile label="Quiz completo no cadastro" value={721} icon={ClipboardList} tone="green" description="de 1000 usuários no app" />
          <StatTile label="Compras aprovadas" value={957} icon={ShoppingCart} tone="blue" />
        </div>
      )}

      {loading ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : (
        <StatTile
          label="Pergunta que mais demora"
          value="Você não está sozinho nessa jornada!"
          icon={Timer}
          tone="amber"
          description="Tempo médio: 34s"
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 5 }, (_, index) => (
            <ChartSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChartCard title="Perfil financeiro" data={PERFIL_FINANCEIRO_DATA} orientation="horizontal" />
          <ChartCard title="Uso de suplementos">
            <EmptyState icon={FileQuestion} message="Ainda não há respostas sobre suplementos." />
          </ChartCard>
          <BarChartCard title="Objetivos dos alunos" data={OBJETIVOS_DATA} orientation="horizontal" />
          <BarChartCard title="Experiência declarada" data={EXPERIENCIA_DATA} orientation="horizontal" />
          <BarChartCard title="Planos dos usuários" data={PLANOS_DATA} orientation="horizontal" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimas respostas recebidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <ListSkeleton rows={3} />
          ) : (
            ULTIMAS_RESPOSTAS.map((item) => (
              <EntityCard
                key={item.email}
                title={item.email}
                metadata={[`${item.respostas} resposta(s)`, new Date(item.timestamp).toLocaleString("pt-BR")]}
                badges={[
                  {
                    label: item.status,
                    variant: "outline",
                    className:
                      item.status === "Concluído"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600",
                  },
                ]}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QuizInicialView({ loading }: { loading: boolean }) {
  const [emailFilter, setEmailFilter] = useState("")
  const [range, setRange] = useState<PeriodFilterRange>("all")

  return (
    <div className="flex flex-col gap-4">
      <PeriodFilterBar emailFilter={emailFilter} onEmailFilterChange={setEmailFilter} range={range} onRangeChange={setRange} />

      {loading ? <StatGridSkeleton columns={5} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile label="Iniciaram" value={117} icon={Users} tone="blue" />
          <StatTile label="Completaram" value={64} icon={BadgeCheck} tone="green" />
          <StatTile label="Desistiram" value={53} icon={TrendingDown} tone="red" />
          <StatTile label="Taxa conclusão" value="54.7%" icon={ClipboardList} tone="purple" />
          <StatTile label="Tempo médio/pergunta" value="13s" icon={Timer} tone="amber" />
        </div>
      )}

      {loading ? (
        <ChartSkeleton />
      ) : (
        <BarChartCard title="📉 Onde as pessoas desistiram" data={DESISTENCIA_POR_PERGUNTA} orientation="vertical" />
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
          <Info className="size-4 shrink-0" />
          Pergunta em vermelho = maior abandono
        </div>
        <p className="text-sm font-semibold">Análise por Pergunta</p>
        {loading ? (
          <ListSkeleton rows={4} />
        ) : (
          <div className="flex flex-col gap-3">
            {ANALISE_PERGUNTAS.map((pergunta) => (
              <DrilldownQuestionCard
                key={pergunta.numero}
                index={pergunta.numero}
                question={pergunta.texto}
                type={pergunta.tipo}
                respondedCount={pergunta.responderam}
                arrivalPercent={pergunta.chegaramPercent}
                avgTime={pergunta.tempoMedio}
                alert={pergunta.alert}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RelatorioAvaliacaoView({ loading }: { loading: boolean }) {
  const [emailFilter, setEmailFilter] = useState("")
  const [range, setRange] = useState<PeriodFilterRange>("all")

  return (
    <div className="flex flex-col gap-4">
      <PeriodFilterBar
        emailFilter={emailFilter}
        onEmailFilterChange={setEmailFilter}
        range={range}
        onRangeChange={setRange}
        onRefresh={() => {}}
      />

      {loading ? <StatGridSkeleton columns={4} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Reavaliações" value={0} icon={RefreshCw} tone="blue" />
          <StatTile label="Alunos avaliados" value={0} icon={Users} tone="purple" />
          <StatTile label="Respostas totais" value={0} icon={MessageSquareText} tone="amber" />
          <StatTile label="Média por aluno" value={0} icon={ClipboardList} tone="green" />
        </div>
      )}

      <span className="text-sm text-muted-foreground">👥 0 reavaliação(ões) no filtro</span>

      <EmptyState icon={RefreshCw} message="Nenhuma resposta de reavaliação ainda..." />

      <EntityCard title="Como você avalia sua evolução física desde o início dos treinos?" expandable>
        <Tabs defaultValue="estatisticas">
          <TabsList>
            <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
            <TabsTrigger value="respostas">👥 Respostas individuais (0)</TabsTrigger>
          </TabsList>
          <TabsContent value="estatisticas" className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile label="Responderam" value={0} icon={Users} tone="blue" />
              <StatTile label="Taxa chegada" value="0%" icon={ClipboardList} tone="purple" />
              <StatTile label="Respostas" value={0} icon={MessageSquareText} tone="amber" />
            </div>
            <EmptyState icon={FileQuestion} message="Nenhuma resposta registrada" />
          </TabsContent>
          <TabsContent value="respostas">
            <EmptyState icon={Users} message="Nenhuma resposta individual registrada" />
          </TabsContent>
        </Tabs>
      </EntityCard>
    </div>
  )
}

function RelatoriosAvaliacaoView({ loading }: { loading: boolean }) {
  const [subTab, setSubTab] = useState<RelatorioSubTab>("visao-geral")

  return (
    <Tabs value={subTab} onValueChange={(value) => setSubTab(value as RelatorioSubTab)}>
      <TabsList className="sticky top-0 z-10">
        <TabsTrigger value="visao-geral">📊 Visão Geral</TabsTrigger>
        <TabsTrigger value="quiz-inicial">💬 Quiz Inicial</TabsTrigger>
        <TabsTrigger value="relatorio-avaliacao">🔄 Relatório da Avaliação</TabsTrigger>
      </TabsList>
      <TabsContent value="visao-geral" className="mt-4">
        <VisaoGeralView loading={loading} />
      </TabsContent>
      <TabsContent value="quiz-inicial" className="mt-4">
        <QuizInicialView loading={loading} />
      </TabsContent>
      <TabsContent value="relatorio-avaliacao" className="mt-4">
        <RelatorioAvaliacaoView loading={loading} />
      </TabsContent>
    </Tabs>
  )
}

function RespostasAvaliacaoView({ canEdit, loading }: { canEdit: boolean; loading: boolean }) {
  const [subTab, setSubTab] = useState<RespostasSubTab>("por-usuario")

  return (
    <Tabs value={subTab} onValueChange={(value) => setSubTab(value as RespostasSubTab)}>
      <TabsList className="sticky top-0 z-10">
        <TabsTrigger value="por-usuario" className="gap-1.5">
          <Users className="size-4" />
          Por Usuário
        </TabsTrigger>
        <TabsTrigger value="por-pergunta" className="gap-1.5">
          <MessageSquareText className="size-4" />
          Por Pergunta
        </TabsTrigger>
        <TabsTrigger value="relatorios" className="gap-1.5">
          <ImageIcon className="size-4" />
          Relatórios
        </TabsTrigger>
      </TabsList>
      <TabsContent value="por-usuario" className="mt-4">
        <PorUsuarioView canEdit={canEdit} loading={loading} />
      </TabsContent>
      <TabsContent value="por-pergunta" className="mt-4">
        <PorPerguntaView loading={loading} />
      </TabsContent>
      <TabsContent value="relatorios" className="mt-4">
        <RelatoriosAvaliacaoView loading={loading} />
      </TabsContent>
    </Tabs>
  )
}

// ————————————————————————————————————————————————————————————————————
// Página
// ————————————————————————————————————————————————————————————————————
const QUIZ_COUNTER = "23 perguntas · 16 avaliações · 1 páginas especiais"

interface AvaliacaoPageProps {
  canEdit?: boolean
}

export function AvaliacaoPage({ canEdit: canEditProp }: AvaliacaoPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)
  const [topTab, setTopTab] = useState<TopTab>("quiz")

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  const isLoading = forceLoading || loading

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* A — entity-list-header: só título + contador, sem botões (CRUD de quiz é pós-MVP) */}
        <EntityListHeader title="Gestão do Quiz" count={QUIZ_COUNTER} className="items-start" />

        {/* B — nav nível 1: Quiz / Respostas de Avaliação */}
        <Tabs value={topTab} onValueChange={(value) => setTopTab(value as TopTab)}>
          <TabsList className="sticky top-0 z-20 h-auto p-1">
            <TabsTrigger value="quiz" className="h-auto flex-col items-start gap-0 px-3 py-1.5 text-left">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <ClipboardList className="size-4" />
                Quiz
              </span>
              <span className="text-xs font-normal text-muted-foreground">Gestão de perguntas e páginas</span>
            </TabsTrigger>
            <TabsTrigger value="respostas" className="h-auto flex-col items-start gap-0 px-3 py-1.5 text-left">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="size-4" />
                Respostas de Avaliação
              </span>
              <span className="text-xs font-normal text-muted-foreground">Visualizar respostas dos usuários</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quiz" className="mt-4 flex flex-col gap-4">
            <QuizManagementView loading={isLoading} />
          </TabsContent>

          <TabsContent value="respostas" className="mt-4 flex flex-col gap-4">
            <RespostasAvaliacaoView canEdit={canEdit} loading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
