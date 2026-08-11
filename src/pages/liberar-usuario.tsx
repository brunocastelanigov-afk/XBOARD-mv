import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Check,
  FileStack,
  Link2,
  Loader2,
  Plus,
  SearchX,
  ShieldCheck,
  Sparkles,
  UserPlus,
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
import { Textarea } from "@/components/atoms/textarea"
import { ToggleButtonGroup } from "@/components/atoms/toggle-button-group"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { LinkedEntitySearchList } from "@/components/composites/linked-entity-search-list"
import { ReorderableListItem } from "@/components/composites/reorderable-list-item"
import { TwoColumnFormLayout } from "@/components/composites/two-column-form-layout"
import { VideoLinkField } from "@/components/composites/video-link-field"
import { WizardTabs } from "@/components/composites/wizard-tabs"

interface MockAluno {
  email: string
  plan: Plan
  eliteDiasRestantes: number
  protocolo: string
}

const MOCK_ALUNOS: MockAluno[] = [
  { email: "joao.silva@email.com", plan: "elite", eliteDiasRestantes: 42, protocolo: "Hipertrofia Avançada" },
  { email: "ana.souza@email.com", plan: "trinca", eliteDiasRestantes: 0, protocolo: "Emagrecimento Full Body" },
  { email: "carlos.pereira@email.com", plan: "elite", eliteDiasRestantes: 7, protocolo: "Força e Potência" },
]

interface MockExercicio {
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

interface MockTreino {
  id: string
  nome: string
  ordem: number
  foco: string
  duracaoMin: number
  imagemLabel?: string
  exercicios: MockExercicio[]
}

interface ProtocoloDetalhe {
  nome: string
  categoria: string
  etiquetaInterna: string
  descricao: string
  nivel: string
  objetivo: string
  frequenciaSemanal: number
  imagemCapaUrl: string
  treinos: MockTreino[]
}

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

function buildMockProtocoloDetalhe(nomeProtocolo: string): ProtocoloDetalhe {
  return {
    nome: nomeProtocolo,
    categoria: "Protocolo A",
    etiquetaInterna: "",
    descricao: "Foco em ganhar massa muscular",
    nivel: "Avançado",
    objetivo: "Ganhar massa muscular",
    frequenciaSemanal: 3,
    imagemCapaUrl: "",
    treinos: [
      {
        id: "treino-1",
        nome: "Treino 1",
        ordem: 1,
        foco: "Aquecimento + abdominal + membros inferiores + superiores",
        duracaoMin: 65,
        exercicios: [
          { id: "ex-1", nome: "Aquecimento", tipo: "Tempo", series: 1, repeticoes: "3 a 5 minutos", descansoSeg: 0, comoExecutar: "", observacoes: "" },
          { id: "ex-2", nome: "Abdominal com rolinho", tipo: "Repetições", series: 3, repeticoes: "12", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-3", nome: "Agachamento livre", tipo: "Repetições", series: 4, repeticoes: "10", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-4", nome: "Cadeira extensora", tipo: "Repetições", series: 3, repeticoes: "12", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-5", nome: "Remada curvada com barra", tipo: "Repetições", series: 4, repeticoes: "10", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-6", nome: "Supino reto com barra", tipo: "Repetições", series: 4, repeticoes: "10", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-7", nome: "Desenvolvimento com barra em pé", tipo: "Repetições", series: 4, repeticoes: "10", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-8", nome: "Tríceps corda no pulley", tipo: "Repetições", series: 3, repeticoes: "12", descansoSeg: 50, comoExecutar: "", observacoes: "" },
        ],
      },
      {
        id: "treino-2",
        nome: "Treino 2",
        ordem: 2,
        foco: "Pernas + posterior",
        duracaoMin: 50,
        exercicios: [
          { id: "ex-9", nome: "Agachamento livre", tipo: "Repetições", series: 4, repeticoes: "10", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-10", nome: "Cadeira extensora", tipo: "Repetições", series: 3, repeticoes: "12", descansoSeg: 50, comoExecutar: "", observacoes: "" },
        ],
      },
      {
        id: "treino-3",
        nome: "Treino 3",
        ordem: 3,
        foco: "Peito + ombro + tríceps",
        duracaoMin: 40,
        exercicios: [
          { id: "ex-11", nome: "Supino reto com barra", tipo: "Repetições", series: 4, repeticoes: "10", descansoSeg: 50, comoExecutar: "", observacoes: "" },
          { id: "ex-12", nome: "Tríceps corda no pulley", tipo: "Repetições", series: 3, repeticoes: "12", descansoSeg: 50, comoExecutar: "", observacoes: "" },
        ],
      },
    ],
  }
}

let mockIdCounter = 0
function nextMockId(prefix: string) {
  mockIdCounter += 1
  return `${prefix}-${mockIdCounter}`
}

type SearchState = "idle" | "loading" | "found" | "not-found"
type CreateState = "idle" | "submitting" | "done"
type SaveState = "idle" | "saving" | "saved"

interface LiberarUsuarioPageProps {
  canEdit?: boolean
}

export function LiberarUsuarioPage({ canEdit: canEditProp }: LiberarUsuarioPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"

  const [createEmail, setCreateEmail] = useState("")
  const [createPlan, setCreatePlan] = useState<Plan>("trinca")
  const [createState, setCreateState] = useState<CreateState>("idle")

  const [searchEmail, setSearchEmail] = useState("")
  const [searchState, setSearchState] = useState<SearchState>("idle")
  const [foundAluno, setFoundAluno] = useState<MockAluno | null>(null)
  const [editPlan, setEditPlan] = useState<Plan>("trinca")
  const [editEliteDias, setEditEliteDias] = useState("")
  const [editSaveState, setEditSaveState] = useState<SaveState>("idle")

  const [protocolModalOpen, setProtocolModalOpen] = useState(false)
  const [protocolSaveState, setProtocolSaveState] = useState<SaveState>("idle")
  const [protocolStep, setProtocolStep] = useState<"1. Dados do protocolo" | "2. Treinos e exercícios">(
    "1. Dados do protocolo"
  )
  const [protocolo, setProtocolo] = useState<ProtocoloDetalhe | null>(null)
  const [expandedTreinoId, setExpandedTreinoId] = useState<string | null>(null)
  const [expandedExercicioId, setExpandedExercicioId] = useState<string | null>(null)
  const [exercicioSearchQuery, setExercicioSearchQuery] = useState("")

  const totalExercicios = protocolo
    ? protocolo.treinos.reduce((sum, treino) => sum + treino.exercicios.length, 0)
    : 0

  function handleOpenProtocolModal(aluno: MockAluno) {
    setProtocolo(buildMockProtocoloDetalhe(aluno.protocolo))
    setProtocolStep("1. Dados do protocolo")
    setExpandedTreinoId(null)
    setExpandedExercicioId(null)
    setProtocolSaveState("idle")
    setProtocolModalOpen(true)
  }

  function handleCloseProtocolModal() {
    setProtocolModalOpen(false)
    setProtocolo(null)
    setProtocolSaveState("idle")
  }

  function handleSaveProtocolo() {
    if (protocolSaveState !== "idle") return
    setProtocolSaveState("saving")
    setTimeout(() => {
      setProtocolSaveState("saved")
      setTimeout(() => {
        handleCloseProtocolModal()
      }, 900)
    }, 900)
  }

  function updateProtocoloField<K extends keyof ProtocoloDetalhe>(field: K, value: ProtocoloDetalhe[K]) {
    setProtocolo((current) => (current ? { ...current, [field]: value } : current))
  }

  function handleAddTreino() {
    setProtocolo((current) => {
      if (!current) return current
      const novo: MockTreino = {
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
    setProtocolo((current) =>
      current ? { ...current, treinos: current.treinos.filter((treino) => treino.id !== treinoId) } : current
    )
    if (expandedTreinoId === treinoId) setExpandedTreinoId(null)
  }

  function updateTreino(treinoId: string, patch: Partial<MockTreino>) {
    setProtocolo((current) =>
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
    const novo: MockExercicio = {
      id: nextMockId("ex"),
      nome: "Novo exercício",
      tipo: "Repetições",
      series: 3,
      repeticoes: "12",
      descansoSeg: 50,
      comoExecutar: "",
      observacoes: "",
    }
    setProtocolo((current) =>
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
    setProtocolo((current) =>
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

  function updateExercicio(treinoId: string, exercicioId: string, patch: Partial<MockExercicio>) {
    setProtocolo((current) =>
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

  function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (createState !== "idle") return
    setCreateState("submitting")
    setTimeout(() => {
      setCreateState("done")
      setTimeout(() => {
        setCreateState("idle")
        setCreateEmail("")
        setCreatePlan("trinca")
      }, 1200)
    }, 900)
  }

  function handleSearch(value: string) {
    const query = value.trim().toLowerCase()
    if (!query) return
    setSearchState("loading")
    setFoundAluno(null)
    setEditSaveState("idle")
    setTimeout(() => {
      const match = MOCK_ALUNOS.find((aluno) => aluno.email.toLowerCase() === query)
      if (match) {
        setFoundAluno(match)
        setEditPlan(match.plan)
        setEditEliteDias(String(match.eliteDiasRestantes))
        setSearchState("found")
      } else {
        setSearchState("not-found")
      }
    }, 800)
  }

  function handleSaveEdit() {
    if (editSaveState !== "idle") return
    setEditSaveState("saving")
    setTimeout(() => {
      setEditSaveState("saved")
      setTimeout(() => setEditSaveState("idle"), 1200)
    }, 900)
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader title="Liberar e editar usuário" className="items-start" />
        <p className="-mt-4 text-sm text-muted-foreground">
          Crie acessos manuais ou ajuste plano, tempo de Elite e protocolo de alunos existentes
        </p>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">Criação e ajuste manual de alunos</p>
              <p className="text-muted-foreground">
                Novos alunos entram com a senha padrão <span className="font-semibold text-foreground">12345</span>.
                No Elite, informe os dias restantes para o vencimento seguir o fluxo normal do app.
              </p>
            </div>
          </CardContent>
        </Card>

        {canEdit ? (
          <TwoColumnFormLayout
            left={{
              title: "Criar usuário",
              children: (
                <form className="flex flex-col gap-4" onSubmit={handleCreateSubmit}>
                  <p className="-mt-1 text-sm text-muted-foreground">
                    Para alunos que ainda não existem no app.
                  </p>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      E-mail do aluno
                    </p>
                    <Input
                      type="email"
                      placeholder="aluno@email.com"
                      value={createEmail}
                      onChange={(event) => setCreateEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Plano</p>
                    <Select value={createPlan} onValueChange={(value) => setCreatePlan(value as Plan)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trinca">Trinca</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={createState !== "idle"}
                    className={createState === "done" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
                  >
                    {createState === "submitting" ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Criando...
                      </>
                    ) : createState === "done" ? (
                      "Usuário criado e liberado!"
                    ) : (
                      <>
                        <UserPlus />
                        Criar e liberar
                      </>
                    )}
                  </Button>
                </form>
              ),
            }}
            right={{
              title: "Editar usuário",
              children: (
                <div className="flex flex-col gap-4">
                  <p className="-mt-1 text-sm text-muted-foreground">
                    Ajuste plano, dias de Elite e protocolo do aluno.
                  </p>
                  <SearchInput
                    placeholder="buscar@email.com"
                    value={searchEmail}
                    onChange={(value) => {
                      setSearchEmail(value)
                      if (searchState !== "idle") {
                        setSearchState("idle")
                        setFoundAluno(null)
                        setEditSaveState("idle")
                      }
                    }}
                    onSearch={handleSearch}
                  />

                  {searchState === "loading" && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  )}

                  {searchState === "not-found" && (
                    <EmptyState icon={SearchX} message="Nenhum aluno encontrado com este e-mail." />
                  )}

                  {searchState === "found" && foundAluno && (
                    <div className="space-y-4 rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground">{foundAluno.email}</p>

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium uppercase text-muted-foreground">Plano</p>
                        <ToggleButtonGroup
                          options={[
                            { label: "⚡ Trinca", value: "trinca" },
                            { label: "👑 Elite", value: "elite" },
                          ]}
                          value={editPlan}
                          onChange={(value) => setEditPlan(value as Plan)}
                          columns={2}
                        />
                      </div>

                      {editPlan === "elite" && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Dias restantes de Elite
                          </p>
                          <Input
                            type="number"
                            min={0}
                            value={editEliteDias}
                            onChange={(event) => setEditEliteDias(event.target.value)}
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Protocolo vinculado
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenProtocolModal(foundAluno)}
                          className="inline-flex rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <Badge variant="secondary" className="cursor-pointer gap-1 hover:bg-secondary/70">
                            <Link2 className="size-3" />
                            {foundAluno.protocolo}
                          </Badge>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <PlanBadge plan={editPlan} />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={editSaveState !== "idle"}
                          className={editSaveState === "saved" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
                        >
                          {editSaveState === "saving" ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Salvando...
                            </>
                          ) : editSaveState === "saved" ? (
                            <>
                              <Check />
                              Salvo!
                            </>
                          ) : (
                            "Salvar alterações"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ),
            }}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <ShieldCheck className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Você não tem permissão para criar ou editar usuários.
              </p>
              <p className="text-sm text-muted-foreground">
                Fale com um administrador se precisar liberar ou ajustar o acesso de um aluno.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {protocolModalOpen && protocolo && (
        <EntityEditModalShell
          title={foundAluno ? `Editar treino individual — ${foundAluno.email}` : "Editar treino individual"}
          description="Organize em duas etapas simples: dados do protocolo e treinos."
          onClose={handleCloseProtocolModal}
          className="max-w-2xl"
          footer={
            protocolStep === "1. Dados do protocolo" ? (
              <>
                <Button type="button" variant="outline" onClick={handleCloseProtocolModal}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => setProtocolStep("2. Treinos e exercícios")}>
                  Próximo: montar treinos
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseProtocolModal}
                  disabled={protocolSaveState === "saving"}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveProtocolo}
                  disabled={protocolSaveState !== "idle"}
                  className={protocolSaveState === "saved" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
                >
                  {protocolSaveState === "saving" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Salvando...
                    </>
                  ) : protocolSaveState === "saved" ? (
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
          <WizardTabs
            steps={[
              { label: "1. Dados do protocolo", icon: Sparkles },
              { label: "2. Treinos e exercícios", icon: FileStack },
            ]}
            active={protocolStep}
            onActiveChange={(value) => setProtocolStep(value as typeof protocolStep)}
            summary={[
              { label: "PROTOCOLO", value: protocolo.nome },
              { label: "TREINOS", value: protocolo.treinos.length },
              { label: "EXERCÍCIOS", value: totalExercicios },
            ]}
          />

          {protocolStep === "1. Dados do protocolo" ? (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Etapa 1</p>
                <p className="text-sm font-semibold">Informações do protocolo</p>
                <p className="text-sm text-muted-foreground">
                  Preencha somente o essencial para o aluno reconhecer o treino no app.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Nome do protocolo *</p>
                <Input value={protocolo.nome} onChange={(event) => updateProtocoloField("nome", event.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Categoria do protocolo *</p>
                  <Select value={protocolo.categoria} onValueChange={(value) => updateProtocoloField("categoria", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Protocolo A">Protocolo A</SelectItem>
                      <SelectItem value="Protocolo B">Protocolo B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Nível</p>
                  <Select value={protocolo.nivel} onValueChange={(value) => updateProtocoloField("nivel", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Iniciante">Iniciante</SelectItem>
                      <SelectItem value="Intermediário">Intermediário</SelectItem>
                      <SelectItem value="Avançado">Avançado</SelectItem>
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
                  value={protocolo.etiquetaInterna}
                  onChange={(event) => updateProtocoloField("etiquetaInterna", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Descrição curta</p>
                <Textarea
                  value={protocolo.descricao}
                  onChange={(event) => updateProtocoloField("descricao", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase text-muted-foreground">Objetivo</p>
                <Input value={protocolo.objetivo} onChange={(event) => updateProtocoloField("objetivo", event.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Frequência semanal</p>
                  <StepperInput
                    value={protocolo.frequenciaSemanal}
                    min={1}
                    max={7}
                    onChange={(value) => updateProtocoloField("frequenciaSemanal", value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Imagem de capa</p>
                  <Input
                    placeholder="https://..."
                    value={protocolo.imagemCapaUrl}
                    onChange={(event) => updateProtocoloField("imagemCapaUrl", event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Etapa 2</p>
                  <p className="text-sm font-semibold">Treinos do protocolo</p>
                  <p className="text-sm text-muted-foreground">
                    Abra um treino, adicione exercícios e mantenha a ordem de execução simples.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddTreino}>
                  <Plus />
                  Adicionar treino
                </Button>
              </div>

              <div className="space-y-3">
                {protocolo.treinos.map((treino) => {
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
                              <p className="text-xs font-medium uppercase text-muted-foreground">Nome do treino</p>
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
                                  onChange={(event) => updateTreino(treino.id, { ordem: Number(event.target.value) })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium uppercase text-muted-foreground">Duração (min)</p>
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
                                value={treino.foco}
                                onChange={(event) => updateTreino(treino.id, { foco: event.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <DropzoneButton
                                label={treino.imagemLabel ? "Trocar imagem do treino" : "Trocar imagem do treino"}
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddExercicio(treino.id)}
                                >
                                  <Plus />
                                  Adicionar
                                </Button>
                              </div>

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

                                            <div className="space-y-1.5">
                                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                                Nome do exercício
                                              </p>
                                              <Input
                                                value={exercicio.nome}
                                                onChange={(event) =>
                                                  updateExercicio(treino.id, exercicio.id, { nome: event.target.value })
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
                                                updateExercicio(treino.id, exercicio.id, { imagemLabel: file.name })
                                              }
                                              accept="image/*"
                                            />

                                            <div className="space-y-1.5">
                                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                                Vídeo do exercício (opcional)
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                Envie o arquivo de vídeo aqui ou cole um link. No app, ele aparece
                                                dentro da tela do exercício.
                                              </p>
                                              <VideoLinkField
                                                url={exercicio.videoUrl}
                                                onUpload={(file) =>
                                                  updateExercicio(treino.id, exercicio.id, { videoUrl: file.name })
                                                }
                                                onRemove={() =>
                                                  updateExercicio(treino.id, exercicio.id, { videoUrl: undefined })
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
                                                      tipo: value as MockExercicio["tipo"],
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
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </EntityEditModalShell>
      )}
    </div>
  )
}
