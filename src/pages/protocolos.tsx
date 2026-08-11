import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Dumbbell,
  FileStack,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search as SearchIcon,
  Send,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { DropzoneButton } from "@/components/atoms/dropzone-button"
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
import { LinkedEntitySearchList } from "@/components/composites/linked-entity-search-list"
import { ReorderableListItem } from "@/components/composites/reorderable-list-item"
import { StatTile } from "@/components/composites/stat-tile"
import { VideoLinkField } from "@/components/composites/video-link-field"
import { WizardTabs } from "@/components/composites/wizard-tabs"
import { cn } from "@/lib/utils"

type TopTab = "protocolos" | "treinos"
type Nivel = "Avançado" | "Intermediário" | "Iniciante"

interface TreinoResumo {
  id: string
  nome: string
  duracaoMin: number
  exerciciosCount: number
}

interface ProtocoloResumo {
  id: string
  categoriaId: string
  tag: string
  nome: string
  notaInterna?: string
  nivel: Nivel
  frequenciaSemanal: number
  treinos: TreinoResumo[]
}

interface CategoriaProtocolo {
  id: string
  letra: string
  nome: string
  protocolos: ProtocoloResumo[]
}

interface ExercicioDetalhe {
  id: string
  nome: string
  tipo: "Repetições" | "Tempo"
  series: number
  repeticoes: string
  descansoSeg: number
  comoExecutar: string
  observacoes: string
  imagemLabel?: string
  videoUrl?: string
}

interface TreinoDetalhe {
  id: string
  nome: string
  ordem: number
  foco: string
  duracaoMin: number
  imagemLabel?: string
  exercicios: ExercicioDetalhe[]
}

interface ProtocoloDetalhe {
  id: string | null
  categoriaId: string
  nome: string
  categoria: string
  etiquetaInterna: string
  descricao: string
  nivel: Nivel
  objetivo: string
  frequenciaSemanal: number
  imagemCapaUrl: string
  treinos: TreinoDetalhe[]
}

const CATEGORIA_OPTIONS = ["Protocolo A", "Protocolo B"]
const NIVEL_OPTIONS: Nivel[] = ["Iniciante", "Intermediário", "Avançado"]

const EXERCICIO_SEARCH_GROUPS = [
  {
    label: "Abdômen",
    items: [
      { id: "ex-abd-1", label: "Abdominal crunch na máquina" },
      { id: "ex-abd-2", label: "Abdominal declinado com peso" },
    ],
  },
  {
    label: "Pernas",
    items: [
      { id: "ex-leg-1", label: "Agachamento livre" },
      { id: "ex-leg-2", label: "Cadeira extensora" },
    ],
  },
  {
    label: "Costas",
    items: [{ id: "ex-back-1", label: "Remada curvada com barra" }],
  },
  {
    label: "Peito",
    items: [{ id: "ex-chest-1", label: "Supino reto com barra" }],
  },
  {
    label: "Ombro",
    items: [{ id: "ex-sho-1", label: "Desenvolvimento com barra em pé" }],
  },
  {
    label: "Tríceps",
    items: [{ id: "ex-tri-1", label: "Tríceps corda no pulley" }],
  },
]

let mockIdCounter = 0
function nextMockId(prefix: string) {
  mockIdCounter += 1
  return `${prefix}-${mockIdCounter}`
}

function buildDetalheFromResumo(protocolo: ProtocoloResumo): ProtocoloDetalhe {
  return {
    id: protocolo.id,
    categoriaId: protocolo.categoriaId,
    nome: protocolo.nome,
    categoria: protocolo.categoriaId === "cat-a" ? "Protocolo A" : "Protocolo B",
    etiquetaInterna: protocolo.notaInterna ?? "",
    descricao: "",
    nivel: protocolo.nivel,
    objetivo: "",
    frequenciaSemanal: protocolo.frequenciaSemanal,
    imagemCapaUrl: "",
    treinos: protocolo.treinos.map((treino, index) => ({
      id: treino.id,
      nome: treino.nome,
      ordem: index + 1,
      foco: "",
      duracaoMin: treino.duracaoMin,
      exercicios: Array.from({ length: treino.exerciciosCount }, (_, exIndex) => ({
        id: `${treino.id}-ex-${exIndex + 1}`,
        nome: `Exercício ${exIndex + 1}`,
        tipo: "Repetições" as const,
        series: 3,
        repeticoes: "12",
        descansoSeg: 50,
        comoExecutar: "",
        observacoes: "",
      })),
    })),
  }
}

function buildBlankDetalhe(categoriaId: string): ProtocoloDetalhe {
  return {
    id: null,
    categoriaId,
    nome: "",
    categoria: categoriaId === "cat-a" ? "Protocolo A" : "Protocolo B",
    etiquetaInterna: "",
    descricao: "",
    nivel: "Iniciante",
    objetivo: "",
    frequenciaSemanal: 3,
    imagemCapaUrl: "",
    treinos: [],
  }
}

const NIVEL_TONES: Record<Nivel, string> = {
  "Avançado": "border-red-500/30 bg-red-500/10 text-red-500",
  "Intermediário": "border-amber-500/30 bg-amber-500/10 text-amber-500",
  Iniciante: "border-green-500/30 bg-green-500/10 text-green-500",
}

function distribuirTreinos(exerciciosTotal: number, treinosCount: number): TreinoResumo[] {
  const base = Math.floor(exerciciosTotal / treinosCount)
  const resto = exerciciosTotal % treinosCount
  const duracoes = [65, 50, 40, 35, 30]
  return Array.from({ length: treinosCount }, (_, index) => ({
    id: `treino-${index + 1}`,
    nome: `Treino ${index + 1}`,
    duracaoMin: duracoes[index] ?? 30,
    exerciciosCount: base + (index < resto ? 1 : 0),
  }))
}

function buildProtocolo(
  categoriaId: string,
  tag: string,
  nome: string,
  nivel: Nivel,
  exerciciosTotal: number,
  frequenciaSemanal = 3,
  treinosCount = 3,
  notaInterna?: string
): ProtocoloResumo {
  return {
    id: `${categoriaId}-${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    categoriaId,
    tag,
    nome,
    notaInterna,
    nivel,
    frequenciaSemanal,
    treinos: distribuirTreinos(exerciciosTotal, treinosCount),
  }
}

// Categoria B só teve 4 protocolos observados nos prints (workouts/18.51.54), mas o
// contador confirmado é "Protocolo B: 6" — os 2 últimos são inferidos por analogia com
// o padrão de nomenclatura da categoria A, sinalizado aqui para confirmação visual futura.
const MOCK_CATEGORIAS: CategoriaProtocolo[] = [
  {
    id: "cat-a",
    letra: "A",
    nome: "Categoria: Protocolo A",
    protocolos: [
      buildProtocolo("cat-a", "PROTOCOLO A", "Treino Experiente - Para Crescer", "Avançado", 27),
      buildProtocolo("cat-a", "PROTOCOLO A", "Treino Experiente - Para Crescer e Secar", "Avançado", 27),
      buildProtocolo("cat-a", "PROTOCOLO A", "Treino Experiente - Para Secar Muito", "Avançado", 24),
      buildProtocolo("cat-a", "PROTOCOLO A", "Treino Iniciante - Para Crescer", "Iniciante", 24),
      buildProtocolo("cat-a", "PROTOCOLO A", "Treino Iniciante - Para Crescer e Secar", "Iniciante", 24),
      buildProtocolo("cat-a", "PROTOCOLO A", "Treino Iniciante - Para Secar Muito", "Iniciante", 22),
    ],
  },
  {
    id: "cat-b",
    letra: "B",
    nome: "Categoria: Protocolo B",
    protocolos: [
      buildProtocolo("cat-b", "PROTOCOLO B", "Iniciante - Crescer", "Iniciante", 24, 3, 3, "Protocolo B"),
      buildProtocolo("cat-b", "PROTOCOLO B", "Iniciante - Crescer e Secar", "Iniciante", 24),
      buildProtocolo("cat-b", "PROTOCOLO B", "Iniciante - Secar Muito", "Iniciante", 22),
      buildProtocolo("cat-b", "PROTOCOLO B", "Experiente - Crescer", "Avançado", 27),
      buildProtocolo("cat-b", "PROTOCOLO B", "Experiente - Crescer e Secar", "Avançado", 27),
      buildProtocolo("cat-b", "PROTOCOLO B", "Experiente - Secar Muito", "Avançado", 24),
    ],
  },
]

type AlunoStatus = "com_protocolo" | "pendente" | "sem_protocolo"

interface AlunoTreino {
  id: string
  nome: string
  email: string
  plano: Plan
  status: AlunoStatus
  protocolo: ProtocoloResumo | null
}

const ALUNO_STATUS_TONE: Record<AlunoStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  com_protocolo: { icon: CheckCircle2, className: "text-green-500", label: "Com protocolo" },
  pendente: { icon: Clock, className: "text-amber-500", label: "Próximo protocolo pendente" },
  sem_protocolo: { icon: Lock, className: "text-blue-500", label: "Sem protocolo" },
}

const MOCK_ALUNOS: AlunoTreino[] = [
  { id: "al-1", nome: "João Silva", email: "joao.silva@email.com", plano: "elite", status: "com_protocolo", protocolo: MOCK_CATEGORIAS[0].protocolos[0] },
  { id: "al-2", nome: "Ana Souza", email: "ana.souza@email.com", plano: "trinca", status: "com_protocolo", protocolo: MOCK_CATEGORIAS[1].protocolos[0] },
  { id: "al-3", nome: "Carlos Pereira", email: "carlos.pereira@email.com", plano: "elite", status: "com_protocolo", protocolo: MOCK_CATEGORIAS[0].protocolos[2] },
  { id: "al-4", nome: "Fernanda Lima", email: "fernanda.lima@email.com", plano: "trinca", status: "pendente", protocolo: MOCK_CATEGORIAS[0].protocolos[3] },
  { id: "al-5", nome: "Gustavo Pereira", email: "gustavo.pereira@email.com", plano: "elite", status: "pendente", protocolo: MOCK_CATEGORIAS[1].protocolos[3] },
  { id: "al-6", nome: "Helena Costa", email: "helena.costa@email.com", plano: "trinca", status: "sem_protocolo", protocolo: null },
  { id: "al-7", nome: "Igor Almeida", email: "igor.almeida@email.com", plano: "elite", status: "sem_protocolo", protocolo: null },
]

const PLANO_FILTER_ALL = "__todos__"
const ALUNOS_PAGE_SIZE = 5

interface ProtocolosPageProps {
  canEdit?: boolean
}

export function ProtocolosPage({ canEdit: canEditProp }: ProtocolosPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [topTab, setTopTab] = useState<TopTab>("protocolos")
  const [categorias, setCategorias] = useState<CategoriaProtocolo[]>(MOCK_CATEGORIAS)
  const [search, setSearch] = useState("")
  const [liberandoId, setLiberandoId] = useState<string | null>(null)
  const [deletingProtocolo, setDeletingProtocolo] = useState<ProtocoloResumo | null>(null)

  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null)
  const [modalStudentEmail, setModalStudentEmail] = useState<string | null>(null)
  const [modalStep, setModalStep] = useState<"1. Dados do protocolo" | "2. Treinos e exercícios">(
    "1. Dados do protocolo"
  )
  const [detalhe, setDetalhe] = useState<ProtocoloDetalhe | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    if (!modalMode) return
    setModalLoading(true)
    const timeout = setTimeout(() => setModalLoading(false), 500)
    return () => clearTimeout(timeout)
  }, [modalMode, detalhe?.id, modalStudentEmail])
  const [expandedTreinoId, setExpandedTreinoId] = useState<string | null>(null)
  const [expandedExercicioId, setExpandedExercicioId] = useState<string | null>(null)
  const [exercicioSearchQuery, setExercicioSearchQuery] = useState("")

  const [emailQueryDraft, setEmailQueryDraft] = useState("")
  const [appliedEmailQuery, setAppliedEmailQuery] = useState("")
  const [planoFilter, setPlanoFilter] = useState(PLANO_FILTER_ALL)
  const [alunoPage, setAlunoPage] = useState(0)

  const totalExerciciosDetalhe = detalhe
    ? detalhe.treinos.reduce((sum, treino) => sum + treino.exercicios.length, 0)
    : 0

  const alunosStats = useMemo(
    () => ({
      noApp: 51864,
      comProtocolo: 51077,
      pendente: MOCK_ALUNOS.filter((aluno) => aluno.status === "pendente").length + 26,
      semProtocolo: 787,
    }),
    []
  )

  const filteredAlunos = useMemo(() => {
    if (forceEmpty) return []
    const query = appliedEmailQuery.trim().toLowerCase()
    return MOCK_ALUNOS.filter((aluno) => {
      if (query && aluno.email.toLowerCase() !== query) return false
      if (planoFilter !== PLANO_FILTER_ALL && aluno.plano !== planoFilter) return false
      return true
    })
  }, [forceEmpty, appliedEmailQuery, planoFilter])

  const alunosTotal = filteredAlunos.length
  const alunosPageStart = alunoPage * ALUNOS_PAGE_SIZE
  const pagedAlunos = filteredAlunos.slice(alunosPageStart, alunosPageStart + ALUNOS_PAGE_SIZE)
  const alunosHasMore = alunosPageStart + ALUNOS_PAGE_SIZE < alunosTotal
  const isAlunoSearchFiltered = appliedEmailQuery.trim() !== "" || planoFilter !== PLANO_FILTER_ALL

  function handleBuscarAluno() {
    setAppliedEmailQuery(emailQueryDraft)
    setAlunoPage(0)
  }

  const isLoading = forceLoading
  const baseCategorias = forceEmpty ? [] : categorias

  const totalProtocolos = useMemo(
    () => categorias.reduce((sum, categoria) => sum + categoria.protocolos.length, 0),
    [categorias]
  )

  const filteredCategorias = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return baseCategorias
    return baseCategorias
      .map((categoria) => ({
        ...categoria,
        protocolos: categoria.protocolos.filter((protocolo) =>
          protocolo.nome.toLowerCase().includes(query)
        ),
      }))
      .filter((categoria) => categoria.protocolos.length > 0)
  }, [baseCategorias, search])

  const isFiltered = search.trim() !== ""

  function openNewProtocolModal() {
    setDetalhe(buildBlankDetalhe(categorias[0]?.id ?? "cat-a"))
    setModalStep("1. Dados do protocolo")
    setSaveState("idle")
    setExpandedTreinoId(null)
    setExpandedExercicioId(null)
    setModalStudentEmail(null)
    setModalMode("create")
  }

  function openEditProtocolModal(protocolo: ProtocoloResumo, options?: { jumpToTreinoId?: string }) {
    setDetalhe(buildDetalheFromResumo(protocolo))
    setModalStep(options?.jumpToTreinoId ? "2. Treinos e exercícios" : "1. Dados do protocolo")
    setSaveState("idle")
    setExpandedTreinoId(options?.jumpToTreinoId ?? null)
    setExpandedExercicioId(null)
    setModalStudentEmail(null)
    setModalMode("edit")
  }

  function openTreinoIndividualModal(aluno: AlunoTreino) {
    setDetalhe(aluno.protocolo ? buildDetalheFromResumo(aluno.protocolo) : buildBlankDetalhe("cat-a"))
    setModalStep("1. Dados do protocolo")
    setSaveState("idle")
    setExpandedTreinoId(null)
    setExpandedExercicioId(null)
    setModalStudentEmail(aluno.email)
    setModalMode(canEdit ? "edit" : "view")
  }

  function closeModal() {
    setModalMode(null)
    setDetalhe(null)
    setSaveState("idle")
    setExpandedTreinoId(null)
    setExpandedExercicioId(null)
    setModalStudentEmail(null)
  }

  function updateDetalheField<K extends keyof ProtocoloDetalhe>(field: K, value: ProtocoloDetalhe[K]) {
    setDetalhe((current) => (current ? { ...current, [field]: value } : current))
  }

  function handleAddTreino() {
    setDetalhe((current) => {
      if (!current) return current
      const novo: TreinoDetalhe = {
        id: nextMockId("treino"),
        nome: `Treino ${current.treinos.length + 1}`,
        ordem: current.treinos.length + 1,
        foco: "",
        duracaoMin: 0,
        exercicios: [],
      }
      return { ...current, treinos: [...current.treinos, novo] }
    })
  }

  function handleRemoveTreino(treinoId: string) {
    setDetalhe((current) =>
      current ? { ...current, treinos: current.treinos.filter((treino) => treino.id !== treinoId) } : current
    )
    if (expandedTreinoId === treinoId) setExpandedTreinoId(null)
  }

  function updateTreino(treinoId: string, patch: Partial<TreinoDetalhe>) {
    setDetalhe((current) =>
      current
        ? {
            ...current,
            treinos: current.treinos.map((treino) =>
              treino.id === treinoId ? { ...treino, ...patch } : treino
            ),
          }
        : current
    )
  }

  function handleAddExercicio(treinoId: string) {
    const novo: ExercicioDetalhe = {
      id: nextMockId("ex"),
      nome: "Novo exercício",
      tipo: "Repetições",
      series: 3,
      repeticoes: "12",
      descansoSeg: 50,
      comoExecutar: "",
      observacoes: "",
    }
    setDetalhe((current) =>
      current
        ? {
            ...current,
            treinos: current.treinos.map((treino) =>
              treino.id === treinoId ? { ...treino, exercicios: [...treino.exercicios, novo] } : treino
            ),
          }
        : current
    )
    setExpandedExercicioId(novo.id)
  }

  function handleRemoveExercicio(treinoId: string, exercicioId: string) {
    setDetalhe((current) =>
      current
        ? {
            ...current,
            treinos: current.treinos.map((treino) =>
              treino.id === treinoId
                ? { ...treino, exercicios: treino.exercicios.filter((ex) => ex.id !== exercicioId) }
                : treino
            ),
          }
        : current
    )
    if (expandedExercicioId === exercicioId) setExpandedExercicioId(null)
  }

  function updateExercicio(treinoId: string, exercicioId: string, patch: Partial<ExercicioDetalhe>) {
    setDetalhe((current) =>
      current
        ? {
            ...current,
            treinos: current.treinos.map((treino) =>
              treino.id === treinoId
                ? {
                    ...treino,
                    exercicios: treino.exercicios.map((ex) =>
                      ex.id === exercicioId ? { ...ex, ...patch } : ex
                    ),
                  }
                : treino
            ),
          }
        : current
    )
  }

  function handleSaveProtocolo() {
    if (!detalhe || saveState !== "idle") return
    setSaveState("saving")
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => {
        const resumo: ProtocoloResumo = {
          id: detalhe.id ?? `${detalhe.categoriaId}-${detalhe.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
          categoriaId: detalhe.categoriaId,
          tag: detalhe.categoria === "Protocolo A" ? "PROTOCOLO A" : "PROTOCOLO B",
          nome: detalhe.nome || "Novo protocolo",
          notaInterna: detalhe.etiquetaInterna || undefined,
          nivel: detalhe.nivel,
          frequenciaSemanal: detalhe.frequenciaSemanal,
          treinos: detalhe.treinos.map((treino) => ({
            id: treino.id,
            nome: treino.nome,
            duracaoMin: treino.duracaoMin,
            exerciciosCount: treino.exercicios.length,
          })),
        }
        setCategorias((current) =>
          current.map((categoria) => {
            if (categoria.id !== detalhe.categoriaId) return categoria
            const exists = categoria.protocolos.some((item) => item.id === resumo.id)
            return {
              ...categoria,
              protocolos: exists
                ? categoria.protocolos.map((item) => (item.id === resumo.id ? resumo : item))
                : [resumo, ...categoria.protocolos],
            }
          })
        )
        closeModal()
      }, 700)
    }, 900)
  }

  function handleLimparDuplicados() {
    setCategorias((current) =>
      current.map((categoria) => {
        const seen = new Set<string>()
        const deduped = categoria.protocolos.filter((protocolo) => {
          if (seen.has(protocolo.nome)) return false
          seen.add(protocolo.nome)
          return true
        })
        return { ...categoria, protocolos: deduped }
      })
    )
  }

  function handleLiberar(protocolo: ProtocoloResumo) {
    if (liberandoId) return
    setLiberandoId(protocolo.id)
    setTimeout(() => setLiberandoId(null), 900)
  }

  function handleCopiar(protocolo: ProtocoloResumo) {
    setCategorias((current) =>
      current.map((categoria) => {
        if (categoria.id !== protocolo.categoriaId) return categoria
        const copia: ProtocoloResumo = {
          ...protocolo,
          id: `${protocolo.id}-copia-${Date.now()}`,
          nome: `${protocolo.nome} (cópia)`,
        }
        const index = categoria.protocolos.findIndex((item) => item.id === protocolo.id)
        const protocolos = [...categoria.protocolos]
        protocolos.splice(index + 1, 0, copia)
        return { ...categoria, protocolos }
      })
    )
  }

  function handleConfirmExcluir() {
    if (!deletingProtocolo) return
    const protocolo = deletingProtocolo
    setCategorias((current) =>
      current.map((categoria) =>
        categoria.id === protocolo.categoriaId
          ? { ...categoria, protocolos: categoria.protocolos.filter((item) => item.id !== protocolo.id) }
          : categoria
      )
    )
    setDeletingProtocolo(null)
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Tabs value={topTab} onValueChange={(value) => setTopTab(value as TopTab)}>
          <TabsList className="sticky top-0 z-20 h-auto p-1">
            <TabsTrigger value="protocolos" className="h-auto flex-col items-start gap-0 px-3 py-1.5 text-left">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Dumbbell className="size-4" />
                Protocolos
              </span>
              <span className="text-xs font-normal text-muted-foreground">Modelos padrão</span>
            </TabsTrigger>
            <TabsTrigger value="treinos" className="h-auto flex-col items-start gap-0 px-3 py-1.5 text-left">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="size-4" />
                Treinos
              </span>
              <span className="text-xs font-normal text-muted-foreground">Ajustes por aluno</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="protocolos" className="mt-4 flex flex-col gap-4">
            <EntityListHeader
              title="Protocolos de treino"
              className="items-start"
              actions={
                canEdit
                  ? [
                      { label: "Limpar duplicados", icon: Trash2, variant: "outline", onClick: handleLimparDuplicados },
                      { label: "Novo protocolo", icon: Plus, onClick: openNewProtocolModal },
                    ]
                  : []
              }
            />
            <p className="-mt-3 text-sm text-muted-foreground">
              {isLoading ? <Skeleton className="h-4 w-40" /> : `${totalProtocolos} protocolo(s) cadastrado(s)`}
            </p>

            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-4 w-52" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Categorias administrativas dos protocolos
                </p>
                <div className="flex flex-wrap gap-2">
                  {categorias.map((categoria) => (
                    <Badge key={categoria.id} variant="secondary">
                      Protocolo {categoria.letra}: {categoria.protocolos.length}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="sticky top-[52px] z-10 bg-background pb-1 pt-1">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <SearchInput placeholder="Buscar protocolo..." value={search} onChange={setSearch} />
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 2 }, (_, index) => (
                  <div key={index} className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCategorias.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                message={
                  isFiltered
                    ? "Nenhum protocolo encontrado para esta busca."
                    : "Nenhuma categoria de protocolo cadastrada ainda."
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                {filteredCategorias.map((categoria, categoriaIndex) => (
                  <EntityCard
                    key={categoria.id}
                    icon={undefined}
                    title={categoria.nome}
                    titleClassName="text-base font-semibold"
                    metadata={[`${categoria.protocolos.length} modelo(s) nesta categoria administrativa`]}
                    badges={[{ label: "Visível apenas no painel", variant: "outline" }]}
                    expandable
                    defaultExpanded={categoriaIndex === 0}
                  >
                    {categoria.protocolos.length === 0 ? (
                      <EmptyState message="Nenhum protocolo nesta categoria ainda." />
                    ) : (
                      <div className="flex flex-col gap-3">
                        {categoria.protocolos.map((protocolo) => {
                          const exerciciosTotal = protocolo.treinos.reduce(
                            (sum, treino) => sum + treino.exerciciosCount,
                            0
                          )
                          return (
                            <div key={protocolo.id}>
                              <EntityCard
                                title={protocolo.nome}
                                titleClassName="text-sm font-semibold"
                                badges={[
                                  { label: protocolo.tag, variant: "outline" },
                                  { label: protocolo.nivel, variant: "outline", className: NIVEL_TONES[protocolo.nivel] },
                                ]}
                                metadata={[
                                  `${protocolo.treinos.length} treinos`,
                                  `${exerciciosTotal} exercícios`,
                                  `${protocolo.frequenciaSemanal}x/sem`,
                                ]}
                                expandable
                                actions={
                                  canEdit
                                    ? [
                                        {
                                          icon: Send,
                                          onClick: () => handleLiberar(protocolo),
                                          label: liberandoId === protocolo.id ? "Liberando..." : "Liberar",
                                        },
                                        { icon: Copy, onClick: () => handleCopiar(protocolo), label: "Copiar" },
                                        {
                                          icon: Pencil,
                                          onClick: () => openEditProtocolModal(protocolo),
                                          label: "Editar",
                                        },
                                        {
                                          icon: Trash2,
                                          onClick: () => setDeletingProtocolo(protocolo),
                                          label: `Excluir "${protocolo.nome}"`,
                                          variant: "destructive",
                                        },
                                      ]
                                    : []
                                }
                              >
                                <div className="space-y-2">
                                  {protocolo.notaInterna && (
                                    <p className="text-xs font-medium text-blue-500">
                                      Nota interna: {protocolo.notaInterna}
                                    </p>
                                  )}
                                  <div className="space-y-1.5">
                                    {protocolo.treinos.map((treino, index) => (
                                      <div
                                        key={treino.id}
                                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                            {index + 1}
                                          </span>
                                          <div>
                                            <p className="text-sm font-medium">{treino.nome}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {treino.duracaoMin} min · {treino.exerciciosCount} exercício(s)
                                            </p>
                                          </div>
                                        </div>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openEditProtocolModal(protocolo, { jumpToTreinoId: treino.id })
                                            }
                                            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                                          >
                                            Editar
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </EntityCard>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </EntityCard>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="treinos" className="mt-4 flex flex-col gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Treinos individuais</h3>
              <p className="text-sm text-muted-foreground">
                Edite o treino de um aluno específico sem alterar o protocolo padrão.
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatTile label="Alunos no app" value={alunosStats.noApp.toLocaleString("pt-BR")} icon={Users} tone="blue" />
                <StatTile
                  label="Com protocolo"
                  value={alunosStats.comProtocolo.toLocaleString("pt-BR")}
                  icon={CheckCircle2}
                  tone="green"
                />
                <StatTile
                  label="Próximo protocolo pendente"
                  value={alunosStats.pendente.toLocaleString("pt-BR")}
                  icon={Clock}
                  tone="amber"
                />
                <StatTile
                  label="Sem protocolo"
                  value={alunosStats.semProtocolo.toLocaleString("pt-BR")}
                  icon={Lock}
                  tone="blue"
                />
              </div>
            )}

            <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center">
              <SearchInput
                placeholder="Digite o e-mail completo e clique em Buscar..."
                value={emailQueryDraft}
                onChange={setEmailQueryDraft}
                onSearch={handleBuscarAluno}
                className="lg:flex-1"
              />
              <Select
                value={planoFilter}
                onValueChange={(value) => {
                  setPlanoFilter(value)
                  setAlunoPage(0)
                }}
              >
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Todos os planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PLANO_FILTER_ALL}>Todos os planos</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                  <SelectItem value="trinca">Trinca</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleBuscarAluno} className="lg:w-auto">
                <SearchIcon />
                Buscar
              </Button>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : alunosTotal === 0 ? (
              <EmptyState
                icon={SearchIcon}
                message={
                  isAlunoSearchFiltered
                    ? "Nenhum aluno encontrado para este e-mail/plano."
                    : "Nenhum aluno cadastrado ainda."
                }
              />
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Mostrando {alunosPageStart + 1}–{Math.min(alunosPageStart + ALUNOS_PAGE_SIZE, alunosTotal)} de{" "}
                    {alunosTotal} aluno(s)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={alunoPage === 0}
                      onClick={() => setAlunoPage((page) => Math.max(0, page - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!alunosHasMore}
                      onClick={() => setAlunoPage((page) => page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {pagedAlunos.map((aluno) => {
                    const statusTone = ALUNO_STATUS_TONE[aluno.status]
                    return (
                      <EntityCard
                        key={aluno.id}
                        title={aluno.nome}
                        titleClassName="text-sm font-semibold"
                        metadata={[aluno.email]}
                        actions={[
                          {
                            icon: Pencil,
                            onClick: () => openTreinoIndividualModal(aluno),
                            label: canEdit ? "Editar treinos" : "Ver treinos",
                          },
                        ]}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <PlanBadge plan={aluno.plano} />
                          <Badge variant="outline" className={cn("gap-1", statusTone.className)}>
                            <statusTone.icon className="size-3" />
                            {statusTone.label}
                          </Badge>
                          {aluno.protocolo && (
                            <Badge variant="secondary" className="gap-1">
                              <Link2 className="size-3" />
                              {aluno.protocolo.nome}
                            </Badge>
                          )}
                        </div>
                      </EntityCard>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {modalMode && detalhe && (() => {
        const isReadOnly = modalMode === "view"
        const modalTitle = modalStudentEmail
          ? `${isReadOnly ? "Treino individual" : "Editar treino individual"} — ${modalStudentEmail}`
          : "Editar protocolo"
        return (
        <EntityEditModalShell
          title={modalTitle}
          description="Organize em duas etapas simples: dados do protocolo e treinos."
          onClose={closeModal}
          className="max-w-2xl"
          footer={
            isReadOnly ? (
              <Button type="button" variant="outline" onClick={closeModal}>
                Fechar
              </Button>
            ) : modalStep === "1. Dados do protocolo" ? (
              <>
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => setModalStep("2. Treinos e exercícios")}>
                  Próximo: montar treinos
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={closeModal} disabled={saveState === "saving"}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveProtocolo}
                  disabled={saveState !== "idle"}
                  className={saveState === "saved" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
                >
                  {saveState === "saving" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Salvando...
                    </>
                  ) : saveState === "saved" ? (
                    <>
                      <Check />
                      Protocolo salvo!
                    </>
                  ) : (
                    <>
                      <Check />
                      Salvar protocolo
                    </>
                  )}
                </Button>
              </>
            )
          }
        >
          {modalLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
              <Skeleton className="h-9 w-64" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ) : (
          <>
          <WizardTabs
            steps={[
              { label: "1. Dados do protocolo", icon: Sparkles },
              { label: "2. Treinos e exercícios", icon: FileStack },
            ]}
            active={modalStep}
            onActiveChange={(value) => setModalStep(value as typeof modalStep)}
            summary={[
              { label: "PROTOCOLO", value: detalhe.nome || "—" },
              { label: "TREINOS", value: detalhe.treinos.length },
              { label: "EXERCÍCIOS", value: totalExerciciosDetalhe },
            ]}
          />

          {modalStep === "1. Dados do protocolo" ? (
            <fieldset disabled={isReadOnly} className="space-y-4">
              <div className="space-y-0.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Etapa 1</p>
                <p className="text-sm font-semibold">Informações do protocolo</p>
                <p className="text-sm text-muted-foreground">
                  Preencha somente o essencial para o aluno reconhecer o treino no app.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Nome do protocolo <span className="text-destructive">*</span>
                </p>
                <Input
                  required
                  value={detalhe.nome}
                  onChange={(event) => updateDetalheField("nome", event.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Categoria do protocolo <span className="text-destructive">*</span>
                  </p>
                  <Select
                    value={detalhe.categoria}
                    onValueChange={(value) => {
                      const categoriaId = value === "Protocolo A" ? "cat-a" : "cat-b"
                      setDetalhe((current) =>
                        current ? { ...current, categoria: value, categoriaId } : current
                      )
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIA_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Nível</p>
                  <Select
                    value={detalhe.nivel}
                    onValueChange={(value) => updateDetalheField("nivel", value as Nivel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Etiqueta interna (só admin vê)
                </p>
                <Input
                  placeholder="Ex: Progressão do A - foco em ombro"
                  value={detalhe.etiquetaInterna}
                  onChange={(event) => updateDetalheField("etiquetaInterna", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Descrição curta</p>
                <Textarea
                  placeholder="Foco em ganhar massa muscular"
                  value={detalhe.descricao}
                  onChange={(event) => updateDetalheField("descricao", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Objetivo</p>
                <Input
                  placeholder="Ganhar massa muscular"
                  value={detalhe.objetivo}
                  onChange={(event) => updateDetalheField("objetivo", event.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Frequência semanal</p>
                  <StepperInput
                    value={detalhe.frequenciaSemanal}
                    min={1}
                    max={7}
                    onChange={(value) => updateDetalheField("frequenciaSemanal", value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Imagem de capa</p>
                  <Input
                    placeholder="https://..."
                    value={detalhe.imagemCapaUrl}
                    onChange={(event) => updateDetalheField("imagemCapaUrl", event.target.value)}
                  />
                </div>
              </div>
            </fieldset>
          ) : (
            <fieldset disabled={isReadOnly} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Etapa 2</p>
                  <p className="text-sm font-semibold">Treinos do protocolo</p>
                  <p className="text-sm text-muted-foreground">
                    Abra um treino, adicione exercícios e mantenha a ordem de execução simples.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTreino}>
                    <Plus />
                    Adicionar treino
                  </Button>
                )}
              </div>

              {detalhe.treinos.length === 0 ? (
                <EmptyState message="Nenhum treino adicionado ainda." />
              ) : (
                <div className="space-y-3">
                  {detalhe.treinos.map((treino) => {
                    const treinoExpanded = expandedTreinoId === treino.id
                    return (
                      <div key={treino.id} className="space-y-3">
                        <ReorderableListItem
                          order={treino.ordem}
                          title={treino.nome}
                          metadata={[`${treino.duracaoMin} min`, `${treino.exercicios.length} exercício(s)`]}
                          onRemove={() => handleRemoveTreino(treino.id)}
                          onExpand={() => setExpandedTreinoId(treinoExpanded ? null : treino.id)}
                        />

                        {treinoExpanded && (
                          <Card className="ml-4 rounded-lg border-border">
                            <CardContent className="space-y-4 p-4">
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium uppercase text-muted-foreground">
                                  Nome do treino
                                </p>
                                <Input
                                  value={treino.nome}
                                  onChange={(event) => updateTreino(treino.id, { nome: event.target.value })}
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium uppercase text-muted-foreground">Ordem</p>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={treino.ordem}
                                    onChange={(event) =>
                                      updateTreino(treino.id, { ordem: Number(event.target.value) })
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium uppercase text-muted-foreground">
                                    Duração (min)
                                  </p>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={treino.duracaoMin}
                                    onChange={(event) =>
                                      updateTreino(treino.id, { duracaoMin: Number(event.target.value) })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium uppercase text-muted-foreground">
                                  Descrição/foco do treino
                                </p>
                                <Textarea
                                  placeholder="Aquecimento + abdominal + membros inferiores + superiores"
                                  value={treino.foco}
                                  onChange={(event) => updateTreino(treino.id, { foco: event.target.value })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <DropzoneButton
                                  label="Trocar imagem do treino"
                                  onFileSelect={(file) => updateTreino(treino.id, { imagemLabel: file.name })}
                                  accept="image/*"
                                />
                                {treino.imagemLabel && (
                                  <p className="text-xs text-muted-foreground">Selecionada: {treino.imagemLabel}</p>
                                )}
                              </div>

                              <div className="space-y-2 border-t border-border pt-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">
                                    Exercícios
                                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                                      {treino.exercicios.length} item(ns) na ordem de execução
                                    </span>
                                  </p>
                                  {!isReadOnly && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddExercicio(treino.id)}
                                    >
                                      <Plus />
                                      Adicionar
                                    </Button>
                                  )}
                                </div>

                                {treino.exercicios.length === 0 ? (
                                  <EmptyState message="Nenhum exercício adicionado a este treino ainda." />
                                ) : (
                                  <div className="space-y-2">
                                    {treino.exercicios.map((exercicio, index) => {
                                      const exercicioExpanded = expandedExercicioId === exercicio.id
                                      return (
                                        <div key={exercicio.id} className="space-y-2">
                                          <ReorderableListItem
                                            order={index + 1}
                                            title={exercicio.nome}
                                            metadata={[
                                              `${exercicio.series} séries`,
                                              `${exercicio.repeticoes} reps`,
                                              `${exercicio.descansoSeg}s descanso`,
                                            ]}
                                            draggable
                                            onRemove={() => handleRemoveExercicio(treino.id, exercicio.id)}
                                            onExpand={() => {
                                              setExpandedExercicioId(exercicioExpanded ? null : exercicio.id)
                                              setExercicioSearchQuery("")
                                            }}
                                          />

                                          {exercicioExpanded && (
                                            <Card className="ml-4 rounded-lg border-border">
                                              <CardContent className="space-y-4 p-4">
                                                <div className="space-y-1.5">
                                                  <p className="text-xs font-medium uppercase text-muted-foreground">
                                                    Buscar exercício cadastrado...
                                                  </p>
                                                  <LinkedEntitySearchList
                                                    query={exercicioSearchQuery}
                                                    onQueryChange={setExercicioSearchQuery}
                                                    groups={EXERCICIO_SEARCH_GROUPS.map((group) => ({
                                                      ...group,
                                                      items: group.items.filter((item) =>
                                                        item.label
                                                          .toLowerCase()
                                                          .includes(exercicioSearchQuery.trim().toLowerCase())
                                                      ),
                                                    })).filter((group) => group.items.length > 0)}
                                                    onSelect={(item) =>
                                                      updateExercicio(treino.id, exercicio.id, { nome: item.label })
                                                    }
                                                  />
                                                </div>

                                                <div className="space-y-1.5">
                                                  <p className="text-xs font-medium uppercase text-muted-foreground">
                                                    Nome do exercício
                                                  </p>
                                                  <Input
                                                    value={exercicio.nome}
                                                    onChange={(event) =>
                                                      updateExercicio(treino.id, exercicio.id, {
                                                        nome: event.target.value,
                                                      })
                                                    }
                                                  />
                                                </div>

                                                <DropzoneButton
                                                  label={
                                                    exercicio.imagemLabel
                                                      ? "Imagem selecionada — trocar"
                                                      : "Selecionar imagem do exercício"
                                                  }
                                                  onFileSelect={(file) =>
                                                    updateExercicio(treino.id, exercicio.id, {
                                                      imagemLabel: file.name,
                                                    })
                                                  }
                                                  accept="image/*"
                                                />

                                                <div className="space-y-1.5">
                                                  <p className="text-xs font-medium uppercase text-muted-foreground">
                                                    Vídeo do exercício (opcional)
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">
                                                    Envie o arquivo de vídeo aqui ou cole um link. No app, ele
                                                    aparece dentro da tela do exercício.
                                                  </p>
                                                  <VideoLinkField
                                                    url={exercicio.videoUrl}
                                                    onUpload={(file) =>
                                                      updateExercicio(treino.id, exercicio.id, {
                                                        videoUrl: file.name,
                                                      })
                                                    }
                                                    onRemove={() =>
                                                      updateExercicio(treino.id, exercicio.id, {
                                                        videoUrl: undefined,
                                                      })
                                                    }
                                                  />
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                  <div className="space-y-1.5">
                                                    <p className="text-xs font-medium uppercase text-muted-foreground">
                                                      Tipo
                                                    </p>
                                                    <Select
                                                      value={exercicio.tipo}
                                                      onValueChange={(value) =>
                                                        updateExercicio(treino.id, exercicio.id, {
                                                          tipo: value as ExercicioDetalhe["tipo"],
                                                        })
                                                      }
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="Repetições">Repetições</SelectItem>
                                                        <SelectItem value="Tempo">Tempo</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                  <div className="space-y-1.5">
                                                    <p className="text-xs font-medium uppercase text-muted-foreground">
                                                      Séries
                                                    </p>
                                                    <StepperInput
                                                      value={exercicio.series}
                                                      min={1}
                                                      onChange={(value) =>
                                                        updateExercicio(treino.id, exercicio.id, { series: value })
                                                      }
                                                    />
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                  <div className="space-y-1.5">
                                                    <p className="text-xs font-medium uppercase text-muted-foreground">
                                                      Repetições
                                                    </p>
                                                    <Input
                                                      value={exercicio.repeticoes}
                                                      onChange={(event) =>
                                                        updateExercicio(treino.id, exercicio.id, {
                                                          repeticoes: event.target.value,
                                                        })
                                                      }
                                                    />
                                                  </div>
                                                  <div className="space-y-1.5">
                                                    <p className="text-xs font-medium uppercase text-muted-foreground">
                                                      Descanso (s)
                                                    </p>
                                                    <Input
                                                      type="number"
                                                      min={0}
                                                      value={exercicio.descansoSeg}
                                                      onChange={(event) =>
                                                        updateExercicio(treino.id, exercicio.id, {
                                                          descansoSeg: Number(event.target.value),
                                                        })
                                                      }
                                                    />
                                                  </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                  <p className="text-xs font-medium uppercase text-muted-foreground">
                                                    Como executar (opcional)
                                                  </p>
                                                  <Textarea
                                                    value={exercicio.comoExecutar}
                                                    onChange={(event) =>
                                                      updateExercicio(treino.id, exercicio.id, {
                                                        comoExecutar: event.target.value,
                                                      })
                                                    }
                                                  />
                                                </div>

                                                <div className="space-y-1.5">
                                                  <p className="text-xs font-medium uppercase text-muted-foreground">
                                                    Observações e cuidados (opcional)
                                                  </p>
                                                  <Textarea
                                                    value={exercicio.observacoes}
                                                    onChange={(event) =>
                                                      updateExercicio(treino.id, exercicio.id, {
                                                        observacoes: event.target.value,
                                                      })
                                                    }
                                                  />
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
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </fieldset>
          )}
          </>
          )}
        </EntityEditModalShell>
        )
      })()}

      {deletingProtocolo && (
        <EntityEditModalShell
          title="Excluir protocolo"
          description={`Tem certeza que deseja excluir "${deletingProtocolo.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setDeletingProtocolo(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeletingProtocolo(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleConfirmExcluir}>
                Excluir definitivamente
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
