import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
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
import { StatTile } from "@/components/composites/stat-tile"
import { WizardTabs } from "@/components/composites/wizard-tabs"
import { adminMutation, adminRpc } from "@/lib/admin-crm-api"

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
  status: string
  versao: number
  released_at: string | null
  created_at: string
  days: TemplateDayRow[]
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
}

interface ProgramDayRow {
  workout_day_id: string
  ordem: number
  nome: string
  foco: string | null
  status: string
  exercicios_snapshot: ProgramExercise[] | null
  exercicios: ProgramExercise[]
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
  dias: {
    ordem: number
    nome: string
    descricao: string
    duracaoMinutos: number | null
    exercicios: {
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
    exercicios: {
      ordem: number
      exerciseId: string
      nome: string
      series: number | null
      repsOuDuracao: string
      descansoSegundos: number
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

const ALUNO_STATUS_TONE = {
  com_protocolo: { icon: CheckCircle2, className: "text-green-500", label: "Com protocolo" },
  pendente: { icon: Clock, className: "text-amber-500", label: "Protocolo pendente" },
  sem_protocolo: { icon: Lock, className: "text-blue-500", label: "Sem protocolo" },
} as const

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
    dias: template.days.map((day) => ({
      ordem: day.ordem,
      nome: day.nome,
      descricao: day.descricao ?? "",
      duracaoMinutos: day.duracao_minutos,
      exercicios: day.exercises.map((exercise) => ({
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

function protocolPayload(form: ProtocolForm) {
  return {
    nome: form.nome,
    categoria: form.categoria || null,
    etiqueta: form.etiqueta || null,
    descricao: form.descricao || null,
    nivel: form.nivel,
    objetivo: form.objetivo,
    duracaoMinutos: form.duracaoMinutos,
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

function programStatus(row: UserProgramRow) {
  if (!row.has_program) return "sem_protocolo"
  if (row.program_status_geracao === "pending" || row.program_status_geracao === "pendente") return "pendente"
  return "com_protocolo"
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateRow | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "program" | null>(null)
  const [protocolFormState, setProtocolFormState] = useState<ProtocolForm | null>(null)
  const [programFormState, setProgramFormState] = useState<ProgramForm | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [modalError, setModalError] = useState<string | null>(null)
  const [emailQueryDraft, setEmailQueryDraft] = useState("")
  const [appliedEmailQuery, setAppliedEmailQuery] = useState("")
  const [planoFilter, setPlanoFilter] = useState(PLANO_FILTER_ALL)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const exerciseCatalog = useMemo(() => exerciseCatalogFromTemplates(templates), [templates])
  const defaultExercise = exerciseCatalog[0]

  async function loadTemplates() {
    const rows = await adminRpc<TemplateRow[]>("admin_protocol_templates_tree", {
      p_status: null,
      p_nivel: null,
      p_objetivo: null,
    })
    setTemplates(rows)
  }

  async function loadStudents() {
    const rows = await adminRpc<UserProgramRow[]>("admin_user_programs_list", {
      p_search_email_exact: appliedEmailQuery.trim() || null,
      p_tier: planoFilter === PLANO_FILTER_ALL ? null : planoFilter,
      p_before_created_at: null,
      p_before_user_id: null,
      p_limit: ALUNOS_PAGE_SIZE,
    })
    setStudents(rows)
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadTemplates(), loadStudents()])
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

  const alunosStats = useMemo(
    () => ({
      noApp: students.length,
      comProtocolo: students.filter((student) => student.has_program).length,
      pendente: students.filter((student) => programStatus(student) === "pendente").length,
      semProtocolo: students.filter((student) => !student.has_program).length,
    }),
    [students]
  )

  const pagedAlunos = forceEmpty ? [] : students
  const alunosHasMore = false
  const isAlunoSearchFiltered = appliedEmailQuery.trim() !== "" || planoFilter !== PLANO_FILTER_ALL

  function handleBuscarAluno() {
    setAppliedEmailQuery(emailQueryDraft)
  }

  function openNewProtocolModal() {
    setProtocolFormState(toProtocolForm(null, categorias[0]?.[0] ?? "A"))
    setProgramFormState(null)
    setModalError(null)
    setSaveState("idle")
    setModalMode("create")
  }

  function openEditProtocolModal(template: TemplateRow) {
    setProtocolFormState(toProtocolForm(template, template.categoria ?? "A"))
    setProgramFormState(null)
    setModalError(null)
    setSaveState("idle")
    setModalMode("edit")
  }

  async function openTreinoIndividualModal(student: UserProgramRow) {
    setProtocolFormState(null)
    setProgramFormState(null)
    setModalError(null)
    setSaveState("idle")
    setModalMode("program")
    try {
      const rows = await adminRpc<ProgramDetailRow[]>("admin_user_program_detail", {
        p_user_id: student.user_id,
      })
      const detail = rows[0]
      if (!detail?.program_id) {
        setModalError("Usuario sem programa atual para editar.")
        return
      }
      setProgramFormState({
        userId: student.user_id,
        email: student.email,
        days: detail.days.map((day) => ({
          workoutDayId: day.workout_day_id,
          nome: day.nome,
          foco: day.foco ?? "",
          exercicios: (day.exercicios_snapshot ?? day.exercicios ?? []).map((exercise, index) => ({
            ordem: exercise.ordem ?? index + 1,
            exerciseId: exercise.exercise_id,
            nome: exercise.nome,
            series: exercise.series ?? null,
            repsOuDuracao: exercise.reps_ou_duracao ?? exercise.reps ?? "",
            descansoSegundos: exercise.descanso_segundos ?? 0,
          })),
        })),
      })
    } catch (detailError) {
      setModalError(errorMessage(detailError))
    }
  }

  function closeModal() {
    setModalMode(null)
    setProtocolFormState(null)
    setProgramFormState(null)
    setSaveState("idle")
    setModalError(null)
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
            dias: [
              ...current.dias,
              {
                ordem: current.dias.length + 1,
                nome: `Treino ${current.dias.length + 1}`,
                descricao: "",
                duracaoMinutos: null,
                exercicios: [],
              },
            ],
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
                    exercicios: [
                      ...day.exercicios,
                      {
                        ordem: day.exercicios.length + 1,
                        exerciseId: defaultExercise.id,
                        nome: defaultExercise.nome,
                        series: 3,
                        repsOuDuracao: "12",
                        descansoSegundos: 60,
                      },
                    ],
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
        ? { ...current, dias: current.dias.filter((_, index) => index !== dayIndex) }
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
                ? { ...day, exercicios: day.exercicios.filter((_, index) => index !== exerciseIndex) }
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

  async function handleSaveProtocolo() {
    if (!protocolFormState || saveState !== "idle") return
    setSaveState("saving")
    setModalError(null)
    try {
      if (protocolFormState.id) {
        await adminMutation(`/admin/protocol-templates/${protocolFormState.id}`, {
          method: "PATCH",
          body: protocolPayload(protocolFormState),
        })
      } else {
        await adminMutation("/admin/protocol-templates", {
          method: "POST",
          body: protocolPayload(protocolFormState),
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
              <StatTile icon={Users} label="No app" value={alunosStats.noApp} tone="blue" />
              <StatTile icon={CheckCircle2} label="Com protocolo" value={alunosStats.comProtocolo} tone="green" />
              <StatTile icon={Clock} label="Pendentes" value={alunosStats.pendente} tone="amber" />
              <StatTile icon={Lock} label="Sem protocolo" value={alunosStats.semProtocolo} tone="purple" />
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
                  const status = programStatus(aluno)
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
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!aluno.has_program}
                          onClick={() => void openTreinoIndividualModal(aluno)}
                        >
                          Editar treino
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {alunosHasMore && (
              <div className="flex justify-center">
                <Button type="button" variant="outline" disabled>
                  Carregar mais
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
              active="1. Dados do protocolo"
              onActiveChange={() => undefined}
            />

            <Input
              placeholder="Nome"
              value={protocolFormState.nome}
              onChange={(event) => updateProtocolForm({ nome: event.target.value })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                placeholder="Categoria"
                value={protocolFormState.categoria}
                onChange={(event) => updateProtocolForm({ categoria: event.target.value.toUpperCase() })}
              />
              <Select
                value={protocolFormState.nivel}
                onValueChange={(value) => updateProtocolForm({ nivel: value as NivelApi })}
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
              <Select
                value={protocolFormState.objetivo}
                onValueChange={(value) => updateProtocolForm({ objetivo: value as ObjetivoApi })}
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
            </div>
            <Input
              placeholder="Etiqueta"
              value={protocolFormState.etiqueta}
              onChange={(event) => updateProtocolForm({ etiqueta: event.target.value })}
            />
            <Textarea
              placeholder="Descrição"
              value={protocolFormState.descricao}
              onChange={(event) => updateProtocolForm({ descricao: event.target.value })}
            />
            <StepperInput
              value={protocolFormState.duracaoMinutos ?? 0}
              min={0}
              onChange={(value) => updateProtocolForm({ duracaoMinutos: value || null })}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Treinos e exercícios</h3>
                <Button type="button" variant="outline" size="sm" onClick={addProtocolDay}>
                  Adicionar treino
                </Button>
              </div>
              {protocolFormState.dias.map((day, dayIndex) => (
                <Card key={dayIndex}>
                  <CardContent className="space-y-3 p-4">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[80px_1fr_1fr_auto]">
                      <StepperInput
                        value={day.ordem}
                        min={1}
                        onChange={(value) => updateProtocolDay(dayIndex, { ordem: value })}
                      />
                      <Input
                        value={day.nome}
                        onChange={(event) => updateProtocolDay(dayIndex, { nome: event.target.value })}
                        placeholder="Nome do treino"
                      />
                      <Input
                        value={day.descricao}
                        onChange={(event) => updateProtocolDay(dayIndex, { descricao: event.target.value })}
                        placeholder="Descrição"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProtocolDay(dayIndex)}
                        aria-label="Remover treino"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {day.exercicios.map((exercise, exerciseIndex) => (
                        <div key={exerciseIndex} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-[80px_1fr_90px_120px_120px_auto]">
                          <StepperInput
                            value={exercise.ordem}
                            min={1}
                            onChange={(value) =>
                              updateProtocolExercise(dayIndex, exerciseIndex, { ordem: value })
                            }
                          />
                          <Input
                            value={exercise.exerciseId}
                            onChange={(event) =>
                              updateProtocolExercise(dayIndex, exerciseIndex, {
                                exerciseId: event.target.value,
                                nome: exerciseCatalog.find((item) => item.id === event.target.value)?.nome ?? exercise.nome,
                              })
                            }
                            placeholder="exerciseId"
                          />
                          <StepperInput
                            value={exercise.series ?? 0}
                            min={0}
                            onChange={(value) =>
                              updateProtocolExercise(dayIndex, exerciseIndex, { series: value || null })
                            }
                          />
                          <Input
                            value={exercise.repsOuDuracao}
                            onChange={(event) =>
                              updateProtocolExercise(dayIndex, exerciseIndex, { repsOuDuracao: event.target.value })
                            }
                            placeholder="Reps/duração"
                          />
                          <StepperInput
                            value={exercise.descansoSegundos}
                            min={0}
                            onChange={(value) =>
                              updateProtocolExercise(dayIndex, exerciseIndex, { descansoSegundos: value })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProtocolExercise(dayIndex, exerciseIndex)}
                            aria-label="Remover exercício"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addProtocolExercise(dayIndex)}>
                        Adicionar exercício real
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
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
                {programFormState.days.map((day, dayIndex) => (
                  <Card key={day.workoutDayId}>
                    <CardContent className="space-y-3 p-4">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Input
                          value={day.nome}
                          onChange={(event) => updateProgramDay(dayIndex, { nome: event.target.value })}
                          placeholder="Nome do treino"
                        />
                        <Input
                          value={day.foco}
                          onChange={(event) => updateProgramDay(dayIndex, { foco: event.target.value })}
                          placeholder="Foco"
                        />
                      </div>
                      {day.exercicios.map((exercise, exerciseIndex) => (
                        <div key={`${day.workoutDayId}-${exerciseIndex}`} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-[80px_1fr_90px_120px_120px]">
                          <StepperInput
                            value={exercise.ordem}
                            min={1}
                            onChange={(value) =>
                              updateProgramExercise(dayIndex, exerciseIndex, { ordem: value })
                            }
                          />
                          <Input
                            value={exercise.exerciseId}
                            onChange={(event) =>
                              updateProgramExercise(dayIndex, exerciseIndex, { exerciseId: event.target.value })
                            }
                            placeholder="exerciseId"
                          />
                          <StepperInput
                            value={exercise.series ?? 0}
                            min={0}
                            onChange={(value) =>
                              updateProgramExercise(dayIndex, exerciseIndex, { series: value || null })
                            }
                          />
                          <Input
                            value={exercise.repsOuDuracao}
                            onChange={(event) =>
                              updateProgramExercise(dayIndex, exerciseIndex, { repsOuDuracao: event.target.value })
                            }
                            placeholder="Reps/duração"
                          />
                          <StepperInput
                            value={exercise.descansoSegundos}
                            min={0}
                            onChange={(value) =>
                              updateProgramExercise(dayIndex, exerciseIndex, { descansoSegundos: value })
                            }
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
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
    </div>
  )
}
