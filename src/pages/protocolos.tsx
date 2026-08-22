import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { DragDropProvider } from "@dnd-kit/react"
import { isSortable } from "@dnd-kit/react/sortable"
import { arrayMove } from "@dnd-kit/helpers"
import {
  Check,
  CheckCircle2,
  Clock,
  Dumbbell,
  FileStack,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search as SearchIcon,
  Trash2,
  Users,
} from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import { PlanBadge, type Plan } from "@/components/atoms/plan-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { SearchInput } from "@/components/atoms/search-input"
import { Skeleton } from "@/components/atoms/skeleton"
import { StepperInput } from "@/components/atoms/stepper-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { Textarea } from "@/components/atoms/textarea"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { LinkedEntitySearchList, type LinkedEntitySearchItem } from "@/components/composites/linked-entity-search-list"
import { ProtocolEditorChoiceCards, ProtocolTemplatePicker } from "@/components/composites/protocol-editor"
import { ReorderableListItem } from "@/components/composites/reorderable-list-item"
import { StatTile } from "@/components/composites/stat-tile"
import { WizardTabs } from "@/components/composites/wizard-tabs"
import { adminMutation, adminRpc } from "@/lib/admin-crm-api"

function youtubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  )
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

type TopTab = "protocolos" | "treinos"
type NivelApi = "iniciante" | "avancado"
type ObjetivoApi = "ganhar_musculo" | "ambos" | "secar"

interface TemplateExerciseRow {
  prescription_id?: string
  exercise_id: string
  nome: string
  ordem: number
  series: number | null
  reps_ou_duracao: string
  descanso_segundos: number
}

interface TemplateDayRow {
  day_id?: string
  ordem: number
  nome: string
  descricao: string | null
  duracao_minutos: number | null
  exercises: TemplateExerciseRow[]
}

interface TemplateRow {
  template_id: string
  nivel: NivelApi
  objetivo: ObjetivoApi
  nome: string
  descricao: string | null
  categoria: string | null
  etiqueta: string | null
  duracao_minutos: number | null
  frequencia_semanal: number | null
  imagem_capa_url: string | null
  status: string
  versao: number
  released_at: string | null
  created_at: string
  days: TemplateDayRow[]
}

interface AdminUserProgramsStatsRow {
  no_app: number
  com_protocolo: number
  aguardando_liberacao: number
  gerando: number
  sem_protocolo: number
}

interface UserProgramRow {
  user_id: string
  email: string
  nome_completo: string | null
  tier: Plan | null
  access_status: string
  has_program: boolean
  program_id: string | null
  program_nome: string | null
  program_status_geracao: string | null
  program_created_at: string | null
  cursor_created_at: string
  cursor_user_id: string
}

interface ProgramExercise {
  exercise_id: string
  nome: string
  ordem: number
  series?: number | null
  reps?: string
  reps_ou_duracao?: string
  descanso_segundos?: number
  peso_kg?: number | string | null
  video_url_override?: string | null
  instrucao_texto_override?: string | null
  observacoes?: string | null
}

interface ProgramDayRow {
  workout_day_id: string
  ordem: number
  nome: string
  foco: string | null
  status: string
  imagem_url?: string | null
  exercicios_snapshot: ProgramExercise[] | null
  exercicios: ProgramExercise[]
}

interface AdminExerciseCatalogRow {
  exercise_id: string
  nome: string
  grupo_muscular: string
  video_url: string | null
  instrucao_texto: string | null
}

interface ProgramDetailRow {
  user_id: string
  program_id: string | null
  program_nome: string | null
  program_foco: string | null
  status_geracao: string | null
  program_created_at: string | null
  days: ProgramDayRow[]
}

interface ProtocolForm {
  id: string | null
  nome: string
  categoria: string
  etiqueta: string
  descricao: string
  nivel: NivelApi
  objetivo: ObjetivoApi
  duracaoMinutos: number | null
  frequenciaSemanal: number | null
  imagemCapaUrl: string
  dias: {
    ordem: number
    nome: string
    descricao: string
    duracaoMinutos: number | null
    exercicios: {
      /** Stable client-side identity for drag reordering — survives edits/reorders, unrelated to `ordem`. */
      key: string
      ordem: number
      exerciseId: string
      nome: string
      series: number | null
      repsOuDuracao: string
      descansoSegundos: number
    }[]
  }[]
}

interface ProgramForm {
  userId: string
  email: string
  days: {
    workoutDayId: string
    nome: string
    foco: string
    imagemUrl: string
    exercicios: {
      /** Stable client-side identity for drag reordering — survives edits/reorders, unrelated to `ordem`. */
      key: string
      ordem: number
      exerciseId: string
      nome: string
      series: number | null
      repsOuDuracao: string
      descansoSegundos: number
      videoUrlOverride: string
      instrucaoTextoOverride: string
      observacoes: string
    }[]
  }[]
}

const NIVEL_OPTIONS: { value: NivelApi; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "avancado", label: "Avançado" },
]

const OBJETIVO_OPTIONS: { value: ObjetivoApi; label: string }[] = [
  { value: "ganhar_musculo", label: "Crescer" },
  { value: "ambos", label: "Crescer e Secar" },
  { value: "secar", label: "Secar" },
]

const PLANO_FILTER_ALL = "__todos__"
const ALUNOS_PAGE_SIZE = 20

type AlunoStatus = "sem_protocolo" | "gerando" | "aguardando_liberacao" | "com_protocolo"

// Mesma janela de carência aplicada no app do aluno (app-treino/src/hooks/
// use-protocol-status.ts ACTIVATION_DELAY_MS) — o countdown visível pro
// aluno mostra 24h, mas a liberação real acontece às 12h. O admin precisa
// usar exatamente esse valor, senão os dois lados discordam sobre quando
// o protocolo está liberado.
const ACTIVATION_DELAY_MS = 12 * 60 * 60 * 1000

const ALUNO_STATUS_TONE: Record<AlunoStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  com_protocolo: { icon: CheckCircle2, className: "text-green-500", label: "Com protocolo" },
  aguardando_liberacao: { icon: Clock, className: "text-amber-500", label: "Aguardando liberação" },
  gerando: { icon: Loader2, className: "text-amber-500 animate-spin", label: "Gerando protocolo" },
  sem_protocolo: { icon: Lock, className: "text-blue-500", label: "Sem protocolo" },
}

function nivelLabel(value: string) {
  return NIVEL_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function objetivoLabel(value: string) {
  return OBJETIVO_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function categoriaLabel(value: string | null) {
  return value ? `Protocolo ${value}` : "Sem categoria"
}

function toProtocolForm(template: TemplateRow | null, defaultCategoria: string): ProtocolForm {
  if (!template) {
    return {
      id: null,
      nome: "",
      categoria: defaultCategoria,
      etiqueta: "",
      descricao: "",
      nivel: "iniciante",
      objetivo: "ganhar_musculo",
      duracaoMinutos: null,
      frequenciaSemanal: null,
      imagemCapaUrl: "",
      dias: [],
    }
  }

  return {
    id: template.template_id,
    nome: template.nome,
    categoria: template.categoria ?? defaultCategoria,
    etiqueta: template.etiqueta ?? "",
    descricao: template.descricao ?? "",
    nivel: template.nivel,
    objetivo: template.objetivo,
    duracaoMinutos: template.duracao_minutos,
    frequenciaSemanal: template.frequencia_semanal,
    imagemCapaUrl: template.imagem_capa_url ?? "",
    dias: template.days.map((day) => ({
      ordem: day.ordem,
      nome: day.nome,
      descricao: day.descricao ?? "",
      duracaoMinutos: day.duracao_minutos,
      exercicios: day.exercises.map((exercise) => ({
        key: crypto.randomUUID(),
        ordem: exercise.ordem,
        exerciseId: exercise.exercise_id,
        nome: exercise.nome,
        series: exercise.series,
        repsOuDuracao: exercise.reps_ou_duracao,
        descansoSegundos: exercise.descanso_segundos,
      })),
    })),
  }
}

function protocolPayload(form: ProtocolForm, mode: "create" | "edit") {
  return {
    nome: form.nome,
    categoria: form.categoria || null,
    etiqueta: form.etiqueta || null,
    descricao: form.descricao || null,
    // nivel/objetivo só entram na criação — o backend rejeita PATCH com
    // esses campos de propósito (cada template ativo é único por
    // nivel×objetivo, e o pipeline de classificação do quiz busca o
    // template por essa combinação; deixar editar quebraria esse mapeamento
    // sem aviso). Duplique o protocolo pra mudar nível/objetivo.
    ...(mode === "create" ? { nivel: form.nivel, objetivo: form.objetivo } : {}),
    duracaoMinutos: form.duracaoMinutos,
    frequenciaSemanal: form.frequenciaSemanal,
    imagemCapaUrl: form.imagemCapaUrl.trim() || null,
    dias: form.dias.map((day) => ({
      ordem: day.ordem,
      nome: day.nome,
      descricao: day.descricao || null,
      duracaoMinutos: day.duracaoMinutos,
      exercicios: day.exercicios.map((exercise) => ({
        ordem: exercise.ordem,
        exerciseId: exercise.exerciseId,
        series: exercise.series,
        repsOuDuracao: exercise.repsOuDuracao,
        descansoSegundos: exercise.descansoSegundos,
      })),
    })),
  }
}

function programPayload(form: ProgramForm) {
  return {
    days: form.days.map((day) => ({
      workoutDayId: day.workoutDayId,
      nome: day.nome || null,
      foco: day.foco || null,
      imagemUrl: day.imagemUrl.trim() || null,
      exercicios: day.exercicios.map((exercise) => ({
        ordem: exercise.ordem,
        exerciseId: exercise.exerciseId,
        series: exercise.series,
        repsOuDuracao: exercise.repsOuDuracao,
        descansoSegundos: exercise.descansoSegundos,
        videoUrlOverride: exercise.videoUrlOverride.trim() || null,
        instrucaoTextoOverride: exercise.instrucaoTextoOverride.trim() || null,
        observacoes: exercise.observacoes.trim() || null,
      })),
    })),
  }
}

function exerciseCatalogFromTemplates(templates: TemplateRow[]) {
  const catalog = new Map<string, { id: string; nome: string }>()
  for (const template of templates) {
    for (const day of template.days) {
      for (const exercise of day.exercises) {
        catalog.set(exercise.exercise_id, { id: exercise.exercise_id, nome: exercise.nome })
      }
    }
  }
  return [...catalog.values()].sort((a, b) => a.nome.localeCompare(b.nome))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nao foi possivel concluir a operacao."
}

// Add/remove sempre renumeram ordem 1..N sequencial pela posição no
// array — nunca reaproveitam o ordem antigo dos itens restantes. Sem isso,
// remover o item 1 deixa o resto começando em 2, e adicionar depois de
// remoções no meio da lista pode duplicar ou pular números.
function renumbered<T extends { ordem: number }>(items: T[]): T[] {
  return items.map((item, index) => (item.ordem === index + 1 ? item : { ...item, ordem: index + 1 }))
}

function programStatus(row: UserProgramRow, nowMs: number): AlunoStatus {
  if (!row.has_program) return "sem_protocolo"
  if (row.program_status_geracao === "preparando") return "gerando"
  if (row.program_created_at) {
    const elapsedMs = nowMs - new Date(row.program_created_at).getTime()
    if (elapsedMs < ACTIVATION_DELAY_MS) return "aguardando_liberacao"
  }
  return "com_protocolo"
}

function hoursRemaining(row: UserProgramRow, nowMs: number): number {
  if (!row.program_created_at) return 0
  const elapsedMs = nowMs - new Date(row.program_created_at).getTime()
  return Math.max(0, Math.ceil((ACTIVATION_DELAY_MS - elapsedMs) / (60 * 60 * 1000)))
}

interface ProtocolosPageProps {
  canEdit?: boolean
}

export function ProtocolosPage({ canEdit: canEditProp }: ProtocolosPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [topTab, setTopTab] = useState<TopTab>("protocolos")
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [students, setStudents] = useState<UserProgramRow[]>([])
  const [programsStats, setProgramsStats] = useState<AdminUserProgramsStatsRow>({
    no_app: 0,
    com_protocolo: 0,
    aguardando_liberacao: 0,
    gerando: 0,
    sem_protocolo: 0,
  })
  const [studentsCursor, setStudentsCursor] = useState<{ createdAt: string; userId: string } | null>(null)
  const [studentsHasMore, setStudentsHasMore] = useState(false)
  const [loadingMoreStudents, setLoadingMoreStudents] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [releasingUserId, setReleasingUserId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateRow | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "program" | "choice" | "assign" | null>(null)
  const [choiceStudent, setChoiceStudent] = useState<UserProgramRow | null>(null)
  const [assignSaveState, setAssignSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [assignError, setAssignError] = useState<string | null>(null)
  const [protocolFormState, setProtocolFormState] = useState<ProtocolForm | null>(null)
  const [programFormState, setProgramFormState] = useState<ProgramForm | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [modalError, setModalError] = useState<string | null>(null)
  const [emailQueryDraft, setEmailQueryDraft] = useState("")
  const [appliedEmailQuery, setAppliedEmailQuery] = useState("")
  const [planoFilter, setPlanoFilter] = useState(PLANO_FILTER_ALL)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [confirmRemoval, setConfirmRemoval] = useState<
    | { kind: "protocol-day"; dayIndex: number; label: string; description: string }
    | { kind: "protocol-exercise"; dayIndex: number; exerciseIndex: number; label: string; description: string }
    | { kind: "program-exercise"; dayIndex: number; exerciseIndex: number; label: string; description: string }
    | null
  >(null)

  function confirmRemovalAction() {
    if (!confirmRemoval) return
    if (confirmRemoval.kind === "protocol-day") {
      removeProtocolDay(confirmRemoval.dayIndex)
    } else if (confirmRemoval.kind === "protocol-exercise") {
      removeProtocolExercise(confirmRemoval.dayIndex, confirmRemoval.exerciseIndex)
    } else {
      removeProgramExercise(confirmRemoval.dayIndex, confirmRemoval.exerciseIndex)
    }
    setConfirmRemoval(null)
  }
  const [exerciseCatalogFull, setExerciseCatalogFull] = useState<AdminExerciseCatalogRow[]>([])
  const [expandedProgramExerciseKey, setExpandedProgramExerciseKey] = useState<string | null>(null)
  const [expandedProtocolDayIndex, setExpandedProtocolDayIndex] = useState<number | null>(null)
  const [modalStep, setModalStep] = useState<"1. Dados do protocolo" | "2. Treinos e exercícios">(
    "1. Dados do protocolo"
  )
  const [exercisePickerQuery, setExercisePickerQuery] = useState("")

  const exerciseCatalog = useMemo(() => exerciseCatalogFromTemplates(templates), [templates])
  const defaultExercise = exerciseCatalog[0]

  async function loadExerciseCatalogFull() {
    const rows = await adminRpc<AdminExerciseCatalogRow[]>("admin_exercises_list", {
      p_is_active: true,
      p_limit: 500,
    })
    setExerciseCatalogFull(rows)
  }

  async function loadTemplates() {
    const rows = await adminRpc<TemplateRow[]>("admin_protocol_templates_tree", {
      p_status: null,
      p_nivel: null,
      p_objetivo: null,
    })
    setTemplates(rows)
  }

  async function loadStudents() {
    const tier = planoFilter === PLANO_FILTER_ALL ? null : planoFilter
    const emailExact = appliedEmailQuery.trim() || null

    const [rows, statsRows] = await Promise.all([
      adminRpc<UserProgramRow[]>("admin_user_programs_list", {
        p_search_email_exact: emailExact,
        p_tier: tier,
        p_before_created_at: null,
        p_before_user_id: null,
        p_limit: ALUNOS_PAGE_SIZE,
      }),
      adminRpc<AdminUserProgramsStatsRow[]>("admin_user_programs_stats", {
        p_search_email_exact: emailExact,
        p_tier: tier,
      }),
    ])

    setStudents(rows)
    if (statsRows[0]) setProgramsStats(statsRows[0])

    const lastRow = rows[rows.length - 1]
    setStudentsCursor(lastRow ? { createdAt: lastRow.cursor_created_at, userId: lastRow.cursor_user_id } : null)
    setStudentsHasMore(rows.length === ALUNOS_PAGE_SIZE)
  }

  async function handleLoadMoreAlunos() {
    if (!studentsCursor || loadingMoreStudents) return
    setLoadingMoreStudents(true)
    setError(null)

    try {
      const rows = await adminRpc<UserProgramRow[]>("admin_user_programs_list", {
        p_search_email_exact: appliedEmailQuery.trim() || null,
        p_tier: planoFilter === PLANO_FILTER_ALL ? null : planoFilter,
        p_before_created_at: studentsCursor.createdAt,
        p_before_user_id: studentsCursor.userId,
        p_limit: ALUNOS_PAGE_SIZE,
      })

      setStudents((current) => [...current, ...rows])

      const lastRow = rows[rows.length - 1]
      setStudentsCursor(lastRow ? { createdAt: lastRow.cursor_created_at, userId: lastRow.cursor_user_id } : null)
      setStudentsHasMore(rows.length === ALUNOS_PAGE_SIZE)
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoadingMoreStudents(false)
    }
  }

  async function handleLiberarProtocolo(aluno: UserProgramRow) {
    if (releasingUserId) return
    setReleasingUserId(aluno.user_id)
    setError(null)
    try {
      await adminMutation(`/admin/users/${aluno.user_id}/program/release`, { method: "POST" })
      await loadStudents()
    } catch (releaseError) {
      setError(errorMessage(releaseError))
    } finally {
      setReleasingUserId(null)
    }
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadTemplates(), loadStudents(), loadExerciseCatalogFull()])
    } catch (loadError) {
      setError(errorMessage(loadError))
      setTemplates([])
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (forceLoading) return
    void loadData()
  }, [forceLoading, appliedEmailQuery, planoFilter])

  const isLoading = forceLoading || loading
  const baseTemplates = forceEmpty ? [] : templates

  const totalProtocolos = templates.length
  const totalTreinos = templates.reduce((sum, template) => sum + template.days.length, 0)
  const totalExercicios = templates.reduce(
    (sum, template) =>
      sum + template.days.reduce((daySum, day) => daySum + day.exercises.length, 0),
    0
  )

  const categorias = useMemo(() => {
    const grouped = new Map<string, TemplateRow[]>()
    for (const template of baseTemplates) {
      const key = template.categoria ?? "Sem categoria"
      grouped.set(key, [...(grouped.get(key) ?? []), template])
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [baseTemplates])

  const filteredCategorias = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return categorias
    return categorias
      .map(([categoria, items]) => [
        categoria,
        items.filter((template) => template.nome.toLowerCase().includes(query)),
      ] as const)
      .filter(([, items]) => items.length > 0)
  }, [categorias, search])

  // Recalcula só quando a lista de alunos muda (nova busca/reload) — não a
  // cada segundo, é uma lista admin, não uma tela de countdown ao vivo.
  const nowMs = useMemo(() => Date.now(), [students])

  const pagedAlunos = forceEmpty ? [] : students
  const alunosHasMore = !forceEmpty && studentsHasMore
  const isAlunoSearchFiltered = appliedEmailQuery.trim() !== "" || planoFilter !== PLANO_FILTER_ALL

  function handleBuscarAluno() {
    setAppliedEmailQuery(emailQueryDraft)
  }

  function openNewProtocolModal() {
    setProtocolFormState(toProtocolForm(null, categorias[0]?.[0] ?? "A"))
    setProgramFormState(null)
    setModalError(null)
    setSaveState("idle")
    setExpandedProtocolDayIndex(null)
    setExpandedProgramExerciseKey(null)
    setModalStep("1. Dados do protocolo")
    setModalMode("create")
  }

  function openEditProtocolModal(template: TemplateRow) {
    setProtocolFormState(toProtocolForm(template, template.categoria ?? "A"))
    setProgramFormState(null)
    setModalError(null)
    setSaveState("idle")
    setExpandedProtocolDayIndex(null)
    setExpandedProgramExerciseKey(null)
    setModalStep("1. Dados do protocolo")
    setModalMode("edit")
  }

  async function openTreinoIndividualModal(student: UserProgramRow) {
    setProtocolFormState(null)
    setProgramFormState(null)
    setModalError(null)
    setSaveState("idle")
    setModalMode("program")
    setExpandedProgramExerciseKey(null)
    try {
      const [rows] = await Promise.all([
        adminRpc<ProgramDetailRow[]>("admin_user_program_detail", { p_user_id: student.user_id }),
        exerciseCatalogFull.length === 0 ? loadExerciseCatalogFull() : Promise.resolve(),
      ])
      const detail = rows[0]
      if (!detail?.program_id) {
        setModalError("Usuario sem programa atual para editar.")
        return
      }
      setProgramFormState({
        userId: student.user_id,
        email: student.email,
        days: detail.days.map((day) => {
          // exercicios_snapshot (cache denormalizado) tem nome/series/reps/
          // descanso mas NUNCA teve exercise_id — só o array `exercicios`
          // (join real com workout_day_exercises) tem o id de verdade e os
          // overrides de video/instrucao/observacoes. Sem esse merge por
          // ordem, exerciseId fica undefined: os campos de override nunca
          // batem com o catálogo (sempre em branco) e o payload de salvar
          // perde exerciseId no JSON.stringify, rejeitado pelo backend.
          const joinedByOrdem = new Map(
            (day.exercicios ?? []).map((joined, index) => [joined.ordem ?? index + 1, joined])
          )
          return {
            workoutDayId: day.workout_day_id,
            nome: day.nome,
            foco: day.foco ?? "",
            imagemUrl: day.imagem_url ?? "",
            exercicios: (day.exercicios_snapshot ?? day.exercicios ?? []).map((exercise, index) => {
              const ordem = exercise.ordem ?? index + 1
              const joined = joinedByOrdem.get(ordem)
              return {
                key: crypto.randomUUID(),
                ordem,
                exerciseId: joined?.exercise_id ?? exercise.exercise_id ?? "",
                nome: exercise.nome,
                series: exercise.series ?? null,
                repsOuDuracao: exercise.reps_ou_duracao ?? exercise.reps ?? "",
                descansoSegundos: exercise.descanso_segundos ?? 0,
                videoUrlOverride: joined?.video_url_override ?? exercise.video_url_override ?? "",
                instrucaoTextoOverride: joined?.instrucao_texto_override ?? exercise.instrucao_texto_override ?? "",
                observacoes: joined?.observacoes ?? exercise.observacoes ?? "",
              }
            }),
          }
        }),
      })
    } catch (detailError) {
      setModalError(errorMessage(detailError))
    }
  }

  // Problema 02: o card inicial pra gerenciar o protocolo/treino de um
  // aluno sempre pergunta primeiro "Editar protocolo" (troca o template)
  // ou "Editar treino" (edita os exercícios do protocolo atual) — a lista
  // de exercícios só aparece se "Editar treino" for escolhido.
  function openChoiceModal(student: UserProgramRow) {
    setChoiceStudent(student)
    setModalError(null)
    setAssignError(null)
    setAssignSaveState("idle")
    setModalMode("choice")
  }

  function openAssignModal() {
    setModalError(null)
    setAssignError(null)
    setAssignSaveState("idle")
    setModalMode("assign")
  }

  // Problema 01: migração manual de protocolo — troca qual template o
  // aluno está seguindo via POST /admin/users/:userId/program/assign. O
  // backend sempre insere um programa NOVO (nunca edita o anterior), ver
  // worker services/program-generation.ts assignTemplate().
  async function handleAssignTemplate(templateId: string) {
    if (!choiceStudent || assignSaveState !== "idle") return
    setAssignSaveState("saving")
    setAssignError(null)
    try {
      await adminMutation(`/admin/users/${choiceStudent.user_id}/program/assign`, {
        method: "POST",
        body: { templateId },
      })
      await loadStudents()
      setAssignSaveState("saved")
      window.setTimeout(closeModal, 700)
    } catch (assignMutationError) {
      setAssignError(errorMessage(assignMutationError))
      setAssignSaveState("idle")
    }
  }

  function closeModal() {
    setModalMode(null)
    setProtocolFormState(null)
    setProgramFormState(null)
    setSaveState("idle")
    setModalError(null)
    setExpandedProtocolDayIndex(null)
    setExpandedProgramExerciseKey(null)
    setModalStep("1. Dados do protocolo")
    setExercisePickerQuery("")
    setChoiceStudent(null)
    setAssignSaveState("idle")
    setAssignError(null)
  }

  function updateProtocolForm(patch: Partial<ProtocolForm>) {
    setProtocolFormState((current) => (current ? { ...current, ...patch } : current))
  }

  function updateProtocolDay(index: number, patch: Partial<ProtocolForm["dias"][number]>) {
    setProtocolFormState((current) =>
      current
        ? {
            ...current,
            dias: current.dias.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)),
          }
        : current
    )
  }

  function updateProtocolExercise(dayIndex: number, exerciseIndex: number, patch: Partial<ProtocolForm["dias"][number]["exercicios"][number]>) {
    setProtocolFormState((current) =>
      current
        ? {
            ...current,
            dias: current.dias.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? {
                    ...day,
                    exercicios: day.exercicios.map((exercise, currentExerciseIndex) =>
                      currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise
                    ),
                  }
                : day
            ),
          }
        : current
    )
  }

  function addProtocolDay() {
    setProtocolFormState((current) =>
      current
        ? {
            ...current,
            dias: renumbered([
              ...current.dias,
              {
                ordem: current.dias.length + 1,
                nome: `Treino ${current.dias.length + 1}`,
                descricao: "",
                duracaoMinutos: null,
                exercicios: [],
              },
            ]),
          }
        : current
    )
  }

  function addProtocolExercise(dayIndex: number) {
    if (!defaultExercise) {
      setModalError("Nenhum exercicio real disponivel nos templates carregados para preencher exerciseId.")
      return
    }
    setProtocolFormState((current) =>
      current
        ? {
            ...current,
            dias: current.dias.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? {
                    ...day,
                    exercicios: renumbered([
                      ...day.exercicios,
                      {
                        key: crypto.randomUUID(),
                        ordem: day.exercicios.length + 1,
                        exerciseId: defaultExercise.id,
                        nome: defaultExercise.nome,
                        series: 3,
                        repsOuDuracao: "12",
                        descansoSegundos: 60,
                      },
                    ]),
                  }
                : day
            ),
          }
        : current
    )
  }

  function removeProtocolDay(dayIndex: number) {
    setProtocolFormState((current) =>
      current
        ? { ...current, dias: renumbered(current.dias.filter((_, index) => index !== dayIndex)) }
        : current
    )
  }

  function removeProtocolExercise(dayIndex: number, exerciseIndex: number) {
    setProtocolFormState((current) =>
      current
        ? {
            ...current,
            dias: current.dias.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? { ...day, exercicios: renumbered(day.exercicios.filter((_, index) => index !== exerciseIndex)) }
                : day
            ),
          }
        : current
    )
  }

  function reorderProtocolExercises(dayIndex: number, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    setProtocolFormState((current) =>
      current
        ? {
            ...current,
            dias: current.dias.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? { ...day, exercicios: renumbered(arrayMove(day.exercicios, fromIndex, toIndex)) }
                : day
            ),
          }
        : current
    )
  }

  function updateProgramDay(index: number, patch: Partial<ProgramForm["days"][number]>) {
    setProgramFormState((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)),
          }
        : current
    )
  }

  function updateProgramExercise(dayIndex: number, exerciseIndex: number, patch: Partial<ProgramForm["days"][number]["exercicios"][number]>) {
    setProgramFormState((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? {
                    ...day,
                    exercicios: day.exercicios.map((exercise, currentExerciseIndex) =>
                      currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise
                    ),
                  }
                : day
            ),
          }
        : current
    )
  }

  function addProgramExercise(dayIndex: number) {
    const fallback = exerciseCatalogFull[0]
    if (!fallback) {
      setModalError("Nenhum exercicio cadastrado no catalogo para adicionar.")
      return
    }
    setProgramFormState((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? {
                    ...day,
                    exercicios: renumbered([
                      ...day.exercicios,
                      {
                        key: crypto.randomUUID(),
                        ordem: day.exercicios.length + 1,
                        exerciseId: fallback.exercise_id,
                        nome: fallback.nome,
                        series: 3,
                        repsOuDuracao: "12",
                        descansoSegundos: 60,
                        videoUrlOverride: "",
                        instrucaoTextoOverride: "",
                        observacoes: "",
                      },
                    ]),
                  }
                : day
            ),
          }
        : current
    )
  }

  function removeProgramExercise(dayIndex: number, exerciseIndex: number) {
    setProgramFormState((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? { ...day, exercicios: renumbered(day.exercicios.filter((_, index) => index !== exerciseIndex)) }
                : day
            ),
          }
        : current
    )
  }

  function reorderProgramExercises(dayIndex: number, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    setProgramFormState((current) =>
      current
        ? {
            ...current,
            days: current.days.map((day, currentDayIndex) =>
              currentDayIndex === dayIndex
                ? { ...day, exercicios: renumbered(arrayMove(day.exercicios, fromIndex, toIndex)) }
                : day
            ),
          }
        : current
    )
  }

  function selectProgramExercise(dayIndex: number, exerciseIndex: number, option: { exercise_id: string; nome: string }) {
    // Troca de exercício sempre limpa os overrides do exercício anterior —
    // vídeo/como-executar exibidos passam a vir do cadastro real do novo
    // exercício (fallback em exerciseCatalogFull) até o admin digitar um
    // override explícito para ele.
    updateProgramExercise(dayIndex, exerciseIndex, {
      exerciseId: option.exercise_id,
      nome: option.nome,
      videoUrlOverride: "",
      instrucaoTextoOverride: "",
    })
    setExercisePickerQuery("")
  }

  function exerciseCatalogToSearchGroups(catalog: AdminExerciseCatalogRow[], query: string) {
    const grouped = new Map<string, LinkedEntitySearchItem[]>()
    const normalizedQuery = query.trim().toLowerCase()
    for (const option of catalog) {
      if (normalizedQuery && !option.nome.toLowerCase().includes(normalizedQuery)) continue
      const items = grouped.get(option.grupo_muscular) ?? []
      items.push({ id: option.exercise_id, label: option.nome })
      grouped.set(option.grupo_muscular, items)
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items }))
  }

  async function handleSaveProtocolo() {
    if (!protocolFormState || saveState !== "idle") return
    setSaveState("saving")
    setModalError(null)
    try {
      if (protocolFormState.id) {
        await adminMutation(`/admin/protocol-templates/${protocolFormState.id}`, {
          method: "PATCH",
          body: protocolPayload(protocolFormState, "edit"),
        })
      } else {
        await adminMutation("/admin/protocol-templates", {
          method: "POST",
          body: protocolPayload(protocolFormState, "create"),
        })
      }
      await loadTemplates()
      setSaveState("saved")
      window.setTimeout(closeModal, 700)
    } catch (saveError) {
      setModalError(errorMessage(saveError))
      setSaveState("idle")
    }
  }

  async function handleSaveProgram() {
    if (!programFormState || saveState !== "idle") return
    setSaveState("saving")
    setModalError(null)
    try {
      await adminMutation(`/admin/users/${programFormState.userId}/program`, {
        method: "PATCH",
        body: programPayload(programFormState),
      })
      await loadStudents()
      setSaveState("saved")
      window.setTimeout(closeModal, 700)
    } catch (saveError) {
      setModalError(errorMessage(saveError))
      setSaveState("idle")
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTemplate || deleteLoading) return
    setDeleteLoading(true)
    setError(null)
    try {
      await adminMutation(`/admin/protocol-templates/${deletingTemplate.template_id}`, {
        method: "DELETE",
      })
      setTemplates((current) => current.filter((template) => template.template_id !== deletingTemplate.template_id))
      setDeletingTemplate(null)
    } catch (deleteError) {
      setError(errorMessage(deleteError))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader
          title="Protocolos"
          actions={canEdit ? [{ label: "Novo Protocolo", icon: Plus, onClick: openNewProtocolModal }] : []}
        />

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Tabs value={topTab} onValueChange={(value) => setTopTab(value as TopTab)}>
          <TabsList>
            <TabsTrigger value="protocolos" className="gap-1.5">
              <FileStack className="size-4" />
              Protocolos
            </TabsTrigger>
            <TabsTrigger value="treinos" className="gap-1.5">
              <Users className="size-4" />
              Treinos individuais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="protocolos" className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatTile icon={FileStack} label="Protocolos" value={totalProtocolos} tone="blue" />
              <StatTile icon={Dumbbell} label="Treinos" value={totalTreinos} tone="green" />
              <StatTile icon={Check} label="Exercícios" value={totalExercicios} tone="amber" />
            </div>

            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar protocolo"
            />

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredCategorias.length === 0 ? (
              <EmptyState icon={FileStack} message="Nenhum protocolo cadastrado." />
            ) : (
              <div className="space-y-5">
                {filteredCategorias.map(([categoria, items]) => (
                  <section key={categoria} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold">{categoriaLabel(categoria)}</h2>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {items.map((template) => (
                        <EntityCard
                          key={template.template_id}
                          title={template.nome}
                          badges={[
                            { label: nivelLabel(template.nivel), variant: "outline" },
                            { label: objetivoLabel(template.objetivo), variant: "secondary" },
                            { label: template.status, variant: template.status === "ativo" ? "default" : "outline" },
                          ]}
                          metadata={[
                            `${template.days.length} treino${template.days.length === 1 ? "" : "s"}`,
                            `versão ${template.versao}`,
                            template.etiqueta ?? "Sem etiqueta",
                          ]}
                          actions={
                            canEdit
                              ? [
                                  { icon: Pencil, onClick: () => openEditProtocolModal(template), label: "Editar" },
                                  {
                                    icon: Trash2,
                                    onClick: () => setDeletingTemplate(template),
                                    label: `Excluir "${template.nome}"`,
                                    variant: "destructive",
                                  },
                                ]
                              : []
                          }
                        >
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {template.descricao || "Sem descrição."}
                          </p>
                        </EntityCard>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="treinos" className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <StatTile icon={Users} label="No app" value={programsStats.no_app} tone="blue" />
              <StatTile icon={CheckCircle2} label="Com protocolo" value={programsStats.com_protocolo} tone="green" />
              <StatTile
                icon={Clock}
                label="Aguardando liberação"
                value={programsStats.aguardando_liberacao}
                tone="amber"
              />
              <StatTile icon={Lock} label="Sem protocolo" value={programsStats.sem_protocolo} tone="purple" />
            </div>

            <Card>
              <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_180px_auto]">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={emailQueryDraft}
                    onChange={(event) => setEmailQueryDraft(event.target.value)}
                    placeholder="Buscar e-mail exato"
                    className="pl-9"
                  />
                </div>
                <Select value={planoFilter} onValueChange={setPlanoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PLANO_FILTER_ALL}>Todos os planos</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                    <SelectItem value="trinca">Trinca</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleBuscarAluno}>
                  Buscar
                </Button>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : pagedAlunos.length === 0 ? (
              <EmptyState
                icon={Users}
                message={
                  isAlunoSearchFiltered
                    ? "Nenhum aluno encontrado com esses filtros."
                    : "Nenhum aluno encontrado."
                }
              />
            ) : (
              <div className="space-y-3">
                {pagedAlunos.map((aluno) => {
                  const status = programStatus(aluno, nowMs)
                  const statusTone = ALUNO_STATUS_TONE[status]
                  const StatusIcon = statusTone.icon
                  return (
                    <Card key={aluno.user_id}>
                      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{aluno.nome_completo || aluno.email}</h3>
                            {aluno.tier && <PlanBadge plan={aluno.tier} />}
                            <Badge variant="outline" className="gap-1">
                              <StatusIcon className={`size-3.5 ${statusTone.className}`} />
                              {statusTone.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{aluno.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {aluno.program_nome || "Sem programa atual"}
                            {status === "aguardando_liberacao" && ` · libera em até ${hoursRemaining(aluno, nowMs)}h`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {status === "aguardando_liberacao" && (
                            <Button
                              type="button"
                              variant="default"
                              disabled={releasingUserId === aluno.user_id}
                              onClick={() => void handleLiberarProtocolo(aluno)}
                            >
                              {releasingUserId === aluno.user_id ? "Liberando..." : "Liberar protocolo"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openChoiceModal(aluno)}
                          >
                            Editar protocolo / treino
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {alunosHasMore && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadMoreAlunos}
                  disabled={loadingMoreStudents}
                >
                  {loadingMoreStudents ? "Carregando..." : "Carregar mais"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {(modalMode === "create" || modalMode === "edit") && protocolFormState && (
        <EntityEditModalShell
          title={modalMode === "create" ? "Novo protocolo" : "Editar protocolo"}
          onClose={closeModal}
          footer={
            <Button
              type="button"
              disabled={saveState !== "idle"}
              className={saveState === "saved" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
              onClick={() => void handleSaveProtocolo()}
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="animate-spin" />
                  Salvando...
                </>
              ) : saveState === "saved" ? (
                <>
                  <Check />
                  Salvo!
                </>
              ) : (
                "Salvar protocolo"
              )}
            </Button>
          }
        >
          <div className="space-y-4">
            {modalError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {modalError}
              </p>
            )}

            <WizardTabs
              steps={[
                { label: "1. Dados do protocolo", icon: FileStack },
                { label: "2. Treinos e exercícios", icon: Dumbbell },
              ]}
              active={modalStep}
              onActiveChange={(value) => setModalStep(value as typeof modalStep)}
            />

            {modalStep === "1. Dados do protocolo" && (
              <div className="space-y-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Informações do protocolo</p>
                  <p className="text-sm text-muted-foreground">
                    Preencha somente o essencial para o aluno reconhecer o treino no app.
                  </p>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Nome do protocolo <span className="text-destructive">*</span>
                  </span>
                  <Input
                    value={protocolFormState.nome}
                    onChange={(event) => updateProtocolForm({ nome: event.target.value })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Categoria do protocolo <span className="text-destructive">*</span>
                  </span>
                  <Input
                    value={protocolFormState.categoria}
                    onChange={(event) => updateProtocolForm({ categoria: event.target.value.toUpperCase() })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Etiqueta interna (só admin vê)
                  </span>
                  <Input
                    value={protocolFormState.etiqueta}
                    onChange={(event) => updateProtocolForm({ etiqueta: event.target.value })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Descrição curta</span>
                  <Textarea
                    value={protocolFormState.descricao}
                    onChange={(event) => updateProtocolForm({ descricao: event.target.value })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Nível</span>
                  <Select
                    value={protocolFormState.nivel}
                    onValueChange={(value) => updateProtocolForm({ nivel: value as NivelApi })}
                    disabled={Boolean(protocolFormState.id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nível" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Objetivo</span>
                  <Select
                    value={protocolFormState.objetivo}
                    onValueChange={(value) => updateProtocolForm({ objetivo: value as ObjetivoApi })}
                    disabled={Boolean(protocolFormState.id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Objetivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJETIVO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                {protocolFormState.id && (
                  <p className="text-xs text-muted-foreground">
                    Nível e objetivo não podem ser alterados depois de criado — duplique o protocolo pra mudar.
                  </p>
                )}
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Duração (min)</span>
                  <StepperInput
                    value={protocolFormState.duracaoMinutos ?? 0}
                    min={0}
                    onChange={(value) => updateProtocolForm({ duracaoMinutos: value || null })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Frequência semanal</span>
                  <StepperInput
                    value={protocolFormState.frequenciaSemanal ?? 0}
                    min={0}
                    max={7}
                    onChange={(value) => updateProtocolForm({ frequenciaSemanal: value || null })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Imagem de capa</span>
                  <Input
                    value={protocolFormState.imagemCapaUrl}
                    onChange={(event) => updateProtocolForm({ imagemCapaUrl: event.target.value })}
                    placeholder="https://..."
                  />
                  {protocolFormState.imagemCapaUrl.trim() && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={protocolFormState.imagemCapaUrl}
                      alt=""
                      className="h-24 w-full rounded-md border border-border object-cover"
                    />
                  )}
                </label>
              </div>
            )}

            {modalStep === "2. Treinos e exercícios" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Treinos e exercícios</h3>
                <Button type="button" variant="outline" size="sm" onClick={addProtocolDay}>
                  Adicionar treino
                </Button>
              </div>
              {protocolFormState.dias.map((day, dayIndex) => {
                const dayExpanded = expandedProtocolDayIndex === dayIndex
                return (
                  <div key={dayIndex} className="space-y-3">
                    <ReorderableListItem
                      order={day.ordem}
                      title={day.nome || `Treino ${dayIndex + 1}`}
                      metadata={[
                        day.duracaoMinutos ? `${day.duracaoMinutos} min` : "Sem duração",
                        `${day.exercicios.length} exercício(s)`,
                      ]}
                      onRemove={() => {
                        const label = day.nome || `Treino ${dayIndex + 1}`
                        setConfirmRemoval({
                          kind: "protocol-day",
                          dayIndex,
                          label,
                          description: `Tem certeza que deseja remover "${label}" e seus ${day.exercicios.length} exercício(s) deste protocolo? Isso não afeta o catálogo de exercícios, só a lista deste protocolo.`,
                        })
                      }}
                      onExpand={() => setExpandedProtocolDayIndex(dayExpanded ? null : dayIndex)}
                    />

                    {dayExpanded && (
                      <Card className="ml-4 rounded-lg border-border">
                        <CardContent className="space-y-4 p-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium uppercase text-muted-foreground">Ordem</span>
                              <StepperInput
                                value={day.ordem}
                                min={1}
                                onChange={(value) => updateProtocolDay(dayIndex, { ordem: value })}
                              />
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium uppercase text-muted-foreground">
                                Duração (min)
                              </span>
                              <StepperInput
                                value={day.duracaoMinutos ?? 0}
                                min={0}
                                onChange={(value) => updateProtocolDay(dayIndex, { duracaoMinutos: value || null })}
                              />
                            </label>
                          </div>
                          <label className="block space-y-1.5">
                            <span className="text-xs font-medium uppercase text-muted-foreground">Nome do treino</span>
                            <Input
                              value={day.nome}
                              onChange={(event) => updateProtocolDay(dayIndex, { nome: event.target.value })}
                              placeholder="Nome do treino"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              Descrição/foco do treino
                            </span>
                            <Textarea
                              value={day.descricao}
                              onChange={(event) => updateProtocolDay(dayIndex, { descricao: event.target.value })}
                              placeholder="Aquecimento + abdominal + membros inferiores + superiores"
                            />
                          </label>

                          <div className="space-y-2 border-t border-border pt-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                Exercícios
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                  {day.exercicios.length} item(ns) na ordem de execução
                                </span>
                              </p>
                              <Button type="button" variant="outline" size="sm" onClick={() => addProtocolExercise(dayIndex)}>
                                <Plus />
                                Adicionar
                              </Button>
                            </div>

                            {day.exercicios.length === 0 ? (
                              <EmptyState message="Nenhum exercício adicionado a este treino ainda." />
                            ) : (
                              <DragDropProvider
                                onDragEnd={(event) => {
                                  const { source } = event.operation
                                  if (!isSortable(source)) return
                                  reorderProtocolExercises(dayIndex, source.initialIndex, source.index)
                                }}
                              >
                              <div className="space-y-2">
                                {day.exercicios.map((exercise, exerciseIndex) => {
                                  const exerciseKey = exercise.key
                                  const exerciseExpanded = expandedProgramExerciseKey === exerciseKey
                                  const catalogEntry = exerciseCatalogFull.find(
                                    (option) => option.exercise_id === exercise.exerciseId
                                  )
                                  return (
                                    <div key={exerciseKey} className="space-y-2">
                                      <ReorderableListItem
                                        id={exerciseKey}
                                        index={exerciseIndex}
                                        order={exercise.ordem}
                                        title={exercise.nome}
                                        metadata={[
                                          `${exercise.series ?? 0} séries`,
                                          exercise.repsOuDuracao,
                                          `${exercise.descansoSegundos}s descanso`,
                                        ]}
                                        draggable
                                        onRemove={() => {
                                          setConfirmRemoval({
                                            kind: "protocol-exercise",
                                            dayIndex,
                                            exerciseIndex,
                                            label: exercise.nome,
                                            description: `Tem certeza que deseja remover "${exercise.nome}" deste treino? O exercício continua cadastrado no catálogo — isso só tira ele desta lista.`,
                                          })
                                        }}
                                        onExpand={() => {
                                          setExpandedProgramExerciseKey(exerciseExpanded ? null : exerciseKey)
                                          setExercisePickerQuery("")
                                        }}
                                      />

                                      {exerciseExpanded && (
                                        <Card className="ml-4 rounded-lg border-border">
                                          <CardContent className="space-y-4 p-4">
                                            <div className="space-y-1.5">
                                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                                Buscar exercício cadastrado...
                                              </p>
                                              <LinkedEntitySearchList
                                                query={exercisePickerQuery}
                                                onQueryChange={setExercisePickerQuery}
                                                groups={exerciseCatalogToSearchGroups(exerciseCatalogFull, exercisePickerQuery)}
                                                onSelect={(item) =>
                                                  updateProtocolExercise(dayIndex, exerciseIndex, {
                                                    exerciseId: item.id,
                                                    nome: item.label,
                                                  })
                                                }
                                              />
                                            </div>

                                            <div className="space-y-4">
                                              <label className="block space-y-1.5">
                                                <span className="text-xs font-medium uppercase text-muted-foreground">
                                                  Séries
                                                </span>
                                                <StepperInput
                                                  value={exercise.series ?? 0}
                                                  min={0}
                                                  onChange={(value) =>
                                                    updateProtocolExercise(dayIndex, exerciseIndex, { series: value || null })
                                                  }
                                                />
                                              </label>
                                              <label className="block space-y-1.5">
                                                <span className="text-xs font-medium uppercase text-muted-foreground">
                                                  Reps/duração
                                                </span>
                                                <Input
                                                  value={exercise.repsOuDuracao}
                                                  onChange={(event) =>
                                                    updateProtocolExercise(dayIndex, exerciseIndex, {
                                                      repsOuDuracao: event.target.value,
                                                    })
                                                  }
                                                  placeholder="Reps/duração"
                                                />
                                              </label>
                                              <label className="block space-y-1.5">
                                                <span className="text-xs font-medium uppercase text-muted-foreground">
                                                  Descanso (s)
                                                </span>
                                                <StepperInput
                                                  value={exercise.descansoSegundos}
                                                  min={0}
                                                  onChange={(value) =>
                                                    updateProtocolExercise(dayIndex, exerciseIndex, { descansoSegundos: value })
                                                  }
                                                />
                                              </label>
                                            </div>

                                            {(catalogEntry?.video_url || catalogEntry?.instrucao_texto) && (
                                              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                                                <p className="text-xs font-medium uppercase text-muted-foreground">
                                                  Dados cadastrados deste exercício (somente leitura — vem do catálogo
                                                  de exercícios, não é editável por protocolo)
                                                </p>
                                                {catalogEntry.video_url && (
                                                  <p className="truncate text-sm text-foreground">
                                                    Vídeo: {catalogEntry.video_url}
                                                  </p>
                                                )}
                                                {catalogEntry.instrucao_texto && (
                                                  <p className="text-sm text-foreground">
                                                    Como executar: {catalogEntry.instrucao_texto}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                              </DragDropProvider>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </EntityEditModalShell>
      )}

      {modalMode === "choice" && choiceStudent && (
        <EntityEditModalShell
          title="Editar protocolo / treino"
          description={choiceStudent.nome_completo || choiceStudent.email}
          onClose={closeModal}
          footer={
            <Button type="button" variant="outline" onClick={closeModal} className="w-full">
              Cancelar
            </Button>
          }
        >
          <ProtocolEditorChoiceCards
            canEditTreino={choiceStudent.has_program}
            onChooseProtocolo={openAssignModal}
            onChooseTreino={() => void openTreinoIndividualModal(choiceStudent)}
          />
        </EntityEditModalShell>
      )}

      {modalMode === "assign" && choiceStudent && (
        <EntityEditModalShell
          title="Editar protocolo"
          description={choiceStudent.nome_completo || choiceStudent.email}
          onClose={closeModal}
          footer={
            <Button
              type="button"
              variant="outline"
              disabled={assignSaveState === "saving"}
              onClick={closeModal}
              className="w-full"
            >
              {assignSaveState === "saved" ? "Fechar" : "Cancelar"}
            </Button>
          }
        >
          <ProtocolTemplatePicker
            templates={templates.map((template) => ({
              id: template.template_id,
              nome: template.nome,
              nivel: template.nivel,
              objetivo: template.objetivo,
              categoria: template.categoria,
            }))}
            currentTemplateNome={choiceStudent.program_nome}
            saving={assignSaveState !== "idle"}
            error={assignError}
            onSelect={(templateId) => void handleAssignTemplate(templateId)}
          />
        </EntityEditModalShell>
      )}

      {modalMode === "program" && (
        <EntityEditModalShell
          title="Editar treino individual"
          onClose={closeModal}
          footer={
            <Button type="button" disabled={saveState !== "idle" || !programFormState} onClick={() => void handleSaveProgram()}>
              {saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo!" : "Salvar treino"}
            </Button>
          }
        >
          <div className="space-y-4">
            {modalError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {modalError}
              </p>
            )}
            {!programFormState ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{programFormState.email}</p>
                {programFormState.days.map((day, dayIndex) => {
                  return (
                    <div key={day.workoutDayId} className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {dayIndex + 1}
                        </span>
                        <p className="text-sm font-medium">
                          {day.nome}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {day.foco || "Sem foco"} · {day.exercicios.length} exercício(s)
                          </span>
                        </p>
                      </div>

                      <Card className="ml-4 rounded-lg border-border">
                        <CardContent className="space-y-4 p-4">
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium uppercase text-muted-foreground">Nome do treino</span>
                              <Input
                                value={day.nome}
                                onChange={(event) => updateProgramDay(dayIndex, { nome: event.target.value })}
                                placeholder="Nome do treino"
                              />
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium uppercase text-muted-foreground">Foco</span>
                              <Input
                                value={day.foco}
                                onChange={(event) => updateProgramDay(dayIndex, { foco: event.target.value })}
                                placeholder="Foco"
                              />
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium uppercase text-muted-foreground">
                                Imagem do treino (opcional)
                              </span>
                              <Input
                                value={day.imagemUrl}
                                onChange={(event) => updateProgramDay(dayIndex, { imagemUrl: event.target.value })}
                                placeholder="https://..."
                              />
                              {day.imagemUrl.trim() && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={day.imagemUrl}
                                  alt=""
                                  className="h-24 w-full rounded-md border border-border object-cover"
                                />
                              )}
                            </label>

                            <div className="space-y-2 border-t border-border pt-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  Exercícios
                                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    {day.exercicios.length} item(ns) na ordem de execução
                                  </span>
                                </p>
                                <Button type="button" variant="outline" size="sm" onClick={() => addProgramExercise(dayIndex)}>
                                  <Plus />
                                  Adicionar
                                </Button>
                              </div>

                              {day.exercicios.length === 0 ? (
                                <EmptyState message="Nenhum exercício adicionado a este treino ainda." />
                              ) : (
                                <DragDropProvider
                                  onDragEnd={(event) => {
                                    const { source } = event.operation
                                    if (!isSortable(source)) return
                                    reorderProgramExercises(dayIndex, source.initialIndex, source.index)
                                  }}
                                >
                                <div className="space-y-2">
                                  {day.exercicios.map((exercise, exerciseIndex) => {
                                    const exerciseKey = exercise.key
                                    const exerciseExpanded = expandedProgramExerciseKey === exerciseKey
                                    const catalogEntry = exerciseCatalogFull.find(
                                      (option) => option.exercise_id === exercise.exerciseId
                                    )
                                    const effectiveVideoUrl = exercise.videoUrlOverride || catalogEntry?.video_url || ""
                                    const effectiveInstrucao =
                                      exercise.instrucaoTextoOverride || catalogEntry?.instrucao_texto || ""
                                    const embedUrl = youtubeEmbedUrl(effectiveVideoUrl)
                                    return (
                                      <div key={exerciseKey} className="space-y-2">
                                        <ReorderableListItem
                                          id={exerciseKey}
                                          index={exerciseIndex}
                                          order={exercise.ordem}
                                          title={exercise.nome}
                                          metadata={[
                                            `${exercise.series ?? 0} séries`,
                                            exercise.repsOuDuracao,
                                            `${exercise.descansoSegundos}s descanso`,
                                          ]}
                                          draggable
                                          onRemove={() => {
                                            setConfirmRemoval({
                                              kind: "program-exercise",
                                              dayIndex,
                                              exerciseIndex,
                                              label: exercise.nome,
                                              description: `Tem certeza que deseja remover "${exercise.nome}" deste treino? O exercício continua cadastrado no catálogo — isso só tira ele desta lista, e só para este aluno.`,
                                            })
                                          }}
                                          onExpand={() => {
                                            setExpandedProgramExerciseKey(exerciseExpanded ? null : exerciseKey)
                                            setExercisePickerQuery("")
                                          }}
                                        />

                                        {exerciseExpanded && (
                                          <Card className="ml-4 rounded-lg border-border">
                                            <CardContent className="space-y-4 p-4">
                                              <div className="space-y-1.5">
                                                <p className="text-xs font-medium uppercase text-muted-foreground">
                                                  Buscar exercício cadastrado...
                                                </p>
                                                <LinkedEntitySearchList
                                                  query={exercisePickerQuery}
                                                  onQueryChange={setExercisePickerQuery}
                                                  groups={exerciseCatalogToSearchGroups(exerciseCatalogFull, exercisePickerQuery)}
                                                  onSelect={(item) =>
                                                    selectProgramExercise(dayIndex, exerciseIndex, {
                                                      exercise_id: item.id,
                                                      nome: item.label,
                                                    })
                                                  }
                                                />
                                              </div>

                                              <div className="space-y-4">
                                                <label className="block space-y-1.5">
                                                  <span className="text-xs font-medium uppercase text-muted-foreground">Séries</span>
                                                  <StepperInput
                                                    value={exercise.series ?? 0}
                                                    min={0}
                                                    onChange={(value) =>
                                                      updateProgramExercise(dayIndex, exerciseIndex, { series: value || null })
                                                    }
                                                  />
                                                </label>
                                                <label className="block space-y-1.5">
                                                  <span className="text-xs font-medium uppercase text-muted-foreground">
                                                    Reps/duração
                                                  </span>
                                                  <Input
                                                    value={exercise.repsOuDuracao}
                                                    onChange={(event) =>
                                                      updateProgramExercise(dayIndex, exerciseIndex, {
                                                        repsOuDuracao: event.target.value,
                                                      })
                                                    }
                                                    placeholder="Reps/duração"
                                                  />
                                                </label>
                                                <label className="block space-y-1.5">
                                                  <span className="text-xs font-medium uppercase text-muted-foreground">
                                                    Descanso (s)
                                                  </span>
                                                  <StepperInput
                                                    value={exercise.descansoSegundos}
                                                    min={0}
                                                    onChange={(value) =>
                                                      updateProgramExercise(dayIndex, exerciseIndex, { descansoSegundos: value })
                                                    }
                                                  />
                                                </label>
                                              </div>

                                              <div className="space-y-1.5">
                                                <p className="text-xs font-medium uppercase text-muted-foreground">
                                                  Vídeo do exercício (opcional)
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {catalogEntry?.video_url && !exercise.videoUrlOverride
                                                    ? "Mostrando o vídeo cadastrado para este exercício. Edite para sobrescrever só para este aluno."
                                                    : "Cole um link do YouTube ou qualquer URL de vídeo. No app, ele aparece dentro da tela do exercício."}
                                                </p>
                                                <Input
                                                  value={effectiveVideoUrl}
                                                  onChange={(event) =>
                                                    updateProgramExercise(dayIndex, exerciseIndex, {
                                                      videoUrlOverride: event.target.value,
                                                    })
                                                  }
                                                  placeholder="https://..."
                                                />
                                                {embedUrl ? (
                                                  <div className="aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                                                    <iframe
                                                      src={embedUrl}
                                                      className="h-full w-full"
                                                      allowFullScreen
                                                      title="Preview do vídeo"
                                                    />
                                                  </div>
                                                ) : null}
                                              </div>

                                              <label className="block space-y-1.5">
                                                <span className="text-xs font-medium uppercase text-muted-foreground">
                                                  Como executar (opcional)
                                                </span>
                                                <Textarea
                                                  value={effectiveInstrucao}
                                                  onChange={(event) =>
                                                    updateProgramExercise(dayIndex, exerciseIndex, {
                                                      instrucaoTextoOverride: event.target.value,
                                                    })
                                                  }
                                                  placeholder="Como executar (opcional)"
                                                />
                                              </label>
                                              <label className="block space-y-1.5">
                                                <span className="text-xs font-medium uppercase text-muted-foreground">
                                                  Observações e cuidados (opcional)
                                                </span>
                                                <Textarea
                                                  value={exercise.observacoes}
                                                  onChange={(event) =>
                                                    updateProgramExercise(dayIndex, exerciseIndex, { observacoes: event.target.value })
                                                  }
                                                  placeholder="Observações e cuidados (opcional)"
                                                />
                                              </label>
                                            </CardContent>
                                          </Card>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                </DragDropProvider>
                              )}
                            </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </EntityEditModalShell>
      )}

      {deletingTemplate && (
        <EntityEditModalShell
          title="Excluir protocolo"
          description={`Tem certeza que deseja excluir "${deletingTemplate.nome}"? A exclusão é soft delete no backend.`}
          onClose={() => setDeletingTemplate(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeletingTemplate(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? "Excluindo..." : "Excluir protocolo"}
              </Button>
            </>
          }
        />
      )}

      {confirmRemoval && (
        <EntityEditModalShell
          title={confirmRemoval.kind === "protocol-day" ? "Remover treino" : "Remover exercício"}
          description={confirmRemoval.description}
          onClose={() => setConfirmRemoval(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setConfirmRemoval(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirmRemovalAction}>
                Remover
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
