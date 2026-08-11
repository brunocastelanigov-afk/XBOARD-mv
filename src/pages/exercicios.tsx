import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Dumbbell, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { SearchInput } from "@/components/atoms/search-input"
import { Skeleton } from "@/components/atoms/skeleton"
import { Textarea } from "@/components/atoms/textarea"
import { CategoryPillFilter } from "@/components/composites/category-pill-filter"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { TwoColumnFormLayout } from "@/components/composites/two-column-form-layout"
import { VideoLinkField } from "@/components/composites/video-link-field"
import { cn } from "@/lib/utils"

const MUSCLE_GROUPS = [
  "Peito",
  "Ombros",
  "Costas",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Pernas",
  "Panturrilhas",
]

const PILL_OPTIONS = ["Todos", ...MUSCLE_GROUPS]

const MUSCLE_GROUP_TONES: Record<string, { badge: string; bar: string }> = {
  Peito: { badge: "border-rose-500/30 bg-rose-500/10 text-rose-500", bar: "border-l-rose-500" },
  Ombros: { badge: "border-amber-500/30 bg-amber-500/10 text-amber-500", bar: "border-l-amber-500" },
  Costas: { badge: "border-blue-500/30 bg-blue-500/10 text-blue-500", bar: "border-l-blue-500" },
  "Bíceps": { badge: "border-violet-500/30 bg-violet-500/10 text-violet-500", bar: "border-l-violet-500" },
  "Tríceps": { badge: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500", bar: "border-l-fuchsia-500" },
  "Abdômen": { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", bar: "border-l-emerald-500" },
  Pernas: { badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-500", bar: "border-l-indigo-500" },
  Panturrilhas: { badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500", bar: "border-l-cyan-500" },
}

const VIDEO_BADGE_CLASS = "border-sky-500/30 bg-sky-500/10 text-sky-500"

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  description: string
  instructions: string
  videoUrl?: string
}

const MOCK_EXERCISES: Exercise[] = [
  {
    id: "abdominal-com-rolinho",
    name: "Abdominal com rolinho",
    muscleGroup: "Abdômen",
    equipment: "Rolo abdominal",
    description: "Exercício abdominal com rolinho focado no core.",
    instructions:
      "Ajoelhe-se no chão, segure o rolinho com as duas mãos e role para frente controlando o core, depois retorne à posição inicial.",
    videoUrl: "https://youtube.com/shorts/abdominal-rolinho",
  },
  {
    id: "abdominal-crunch-maquina",
    name: "Abdominal crunch na máquina",
    muscleGroup: "Abdômen",
    equipment: "Máquina",
    description: "Crunch em máquina para contração isolada do abdômen.",
    instructions: "Ajuste o banco, prenda os pés e flexione o tronco contraindo o abdômen.",
    videoUrl: "https://youtube.com/shorts/_xqHkyrwOWQ",
  },
  {
    id: "supino-reto-barra",
    name: "Supino reto com barra",
    muscleGroup: "Peito",
    equipment: "Barra e banco",
    description: "Exercício composto para desenvolvimento do peitoral.",
    instructions: "Deite no banco, desça a barra até o peito e empurre até a extensão dos braços.",
    videoUrl: "https://youtube.com/shorts/supino-reto",
  },
  {
    id: "desenvolvimento-ombros",
    name: "Desenvolvimento de ombros",
    muscleGroup: "Ombros",
    equipment: "Halteres",
    description: "Movimento para fortalecer o deltoide.",
    instructions: "Sentado, empurre os halteres para cima até estender os braços sobre a cabeça.",
  },
  {
    id: "puxada-frontal",
    name: "Puxada frontal",
    muscleGroup: "Costas",
    equipment: "Máquina de puxada",
    description: "Exercício para desenvolvimento do latíssimo do dorso.",
    instructions: "Puxe a barra em direção à parte superior do peito, mantendo o tronco ereto.",
    videoUrl: "https://youtube.com/shorts/puxada-frontal",
  },
  {
    id: "rosca-direta",
    name: "Rosca direta",
    muscleGroup: "Bíceps",
    equipment: "Barra reta",
    description: "Exercício isolado para o bíceps.",
    instructions: "Com os cotovelos fixos ao lado do corpo, flexione os braços levando a barra até o peito.",
  },
  {
    id: "triceps-corda",
    name: "Tríceps corda",
    muscleGroup: "Tríceps",
    equipment: "Polia",
    description: "Exercício isolado para o tríceps na polia alta.",
    instructions: "Empurre a corda para baixo estendendo os cotovelos, mantendo-os fixos ao corpo.",
    videoUrl: "https://youtube.com/shorts/triceps-corda",
  },
  {
    id: "agachamento-livre",
    name: "Agachamento livre",
    muscleGroup: "Pernas",
    equipment: "Barra",
    description: "Exercício composto para membros inferiores.",
    instructions: "Com a barra apoiada nas costas, agache até formar 90° nos joelhos e retorne.",
    videoUrl: "https://youtube.com/shorts/agachamento-livre",
  },
  {
    id: "panturrilha-em-pe",
    name: "Panturrilha em pé",
    muscleGroup: "Panturrilhas",
    equipment: "Máquina",
    description: "Exercício isolado para a panturrilha.",
    instructions: "Suba na ponta dos pés contraindo a panturrilha e desça controladamente.",
  },
]

interface ExerciseFormState {
  name: string
  muscleGroup: string
  equipment: string
  description: string
  instructions: string
  videoUrl: string
}

function toFormState(exercise: Exercise | null): ExerciseFormState {
  if (!exercise) {
    return {
      name: "",
      muscleGroup: MUSCLE_GROUPS[0],
      equipment: "",
      description: "",
      instructions: "",
      videoUrl: "",
    }
  }
  return {
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    description: exercise.description,
    instructions: exercise.instructions,
    videoUrl: exercise.videoUrl ?? "",
  }
}

function toEmbedUrl(url: string): string | undefined {
  if (!url) return undefined
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/)
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`
  const watchMatch = url.match(/[?&]v=([\w-]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  return url
}

type ModalMode = "create" | "edit" | "view" | null

interface ExerciciosPageProps {
  canEdit?: boolean
}

export function ExerciciosPage({ canEdit: canEditProp }: ExerciciosPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<Exercise[]>(MOCK_EXERCISES)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("Todos")
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ExerciseFormState>(toFormState(null))
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const baseList = forceEmpty ? [] : exercises

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase()
    return baseList.filter((exercise) => {
      const matchesCategory = activeCategory === "Todos" || exercise.muscleGroup === activeCategory
      const matchesSearch = query === "" || exercise.name.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [baseList, activeCategory, search])

  const isFiltered = search.trim() !== "" || activeCategory !== "Todos"

  function openNewModal() {
    setEditingId(null)
    setForm(toFormState(null))
    setModalMode("create")
  }

  function openEditModal(exercise: Exercise) {
    setEditingId(exercise.id)
    setForm(toFormState(exercise))
    setModalMode("edit")
  }

  function openViewModal(exercise: Exercise) {
    setEditingId(exercise.id)
    setForm(toFormState(exercise))
    setModalMode("view")
  }

  function closeModal() {
    setModalMode(null)
    setEditingId(null)
  }

  function handleConfirmDelete() {
    if (!deletingExercise) return
    setExercises((current) => current.filter((exercise) => exercise.id !== deletingExercise.id))
    setDeletingExercise(null)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (editingId) {
      setExercises((current) =>
        current.map((exercise) =>
          exercise.id === editingId
            ? {
                ...exercise,
                name: form.name,
                muscleGroup: form.muscleGroup,
                equipment: form.equipment,
                description: form.description,
                instructions: form.instructions,
                videoUrl: form.videoUrl || undefined,
              }
            : exercise
        )
      )
    } else {
      setExercises((current) => [
        {
          id: `mock-${Date.now()}`,
          name: form.name || "Novo exercício",
          muscleGroup: form.muscleGroup,
          equipment: form.equipment,
          description: form.description,
          instructions: form.instructions,
          videoUrl: form.videoUrl || undefined,
        },
        ...current,
      ])
    }

    closeModal()
  }

  const isReadOnly = modalMode === "view"
  const modalTitle =
    modalMode === "create" ? "Novo exercício" : modalMode === "view" ? "Exercício" : "Editar exercício"

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EntityListHeader
          title="Exercícios"
          className="items-start"
          actions={canEdit ? [{ label: "Novo Exercício", icon: Plus, onClick: openNewModal }] : []}
        />
        <p className="-mt-3 text-sm text-muted-foreground">
          {isLoading ? <Skeleton className="h-4 w-24" /> : `${filteredList.length} exercícios`}
        </p>

        <div className="sticky top-0 z-10 space-y-3 bg-background pb-3 pt-1">
          <SearchInput
            placeholder="Buscar exercício..."
            value={search}
            onChange={setSearch}
          />
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          ) : (
            <CategoryPillFilter
              options={PILL_OPTIONS}
              active={activeCategory}
              onChange={setActiveCategory}
            />
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-8 w-16 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            message={
              isFiltered ? "Nenhum exercício encontrado." : "Nenhum exercício cadastrado ainda."
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {filteredList.map((exercise) => {
              const tone = MUSCLE_GROUP_TONES[exercise.muscleGroup]
              return (
                <div
                  key={exercise.id}
                  onClick={!canEdit ? () => openViewModal(exercise) : undefined}
                  className={cn(!canEdit && "cursor-pointer")}
                >
                  <EntityCard
                    title={exercise.name}
                    titleClassName="text-base font-semibold tracking-tight"
                    className={cn("border-l-4 transition-shadow hover:shadow-md", tone?.bar)}
                    badges={[
                      { label: exercise.muscleGroup, variant: "outline", className: tone?.badge },
                      ...(exercise.videoUrl
                        ? [
                            {
                              label: "Vídeo",
                              variant: "outline" as const,
                              className: cn(VIDEO_BADGE_CLASS, "gap-1"),
                            },
                          ]
                        : []),
                    ]}
                    actions={
                      canEdit
                        ? [
                            { icon: Pencil, onClick: () => openEditModal(exercise), label: "Editar" },
                            {
                              icon: Trash2,
                              onClick: () => setDeletingExercise(exercise),
                              label: `Excluir "${exercise.name}"`,
                              variant: "destructive",
                            },
                          ]
                        : []
                    }
                  >
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground/90">
                        Equipamento:{" "}
                        <span className="font-normal text-muted-foreground">{exercise.equipment}</span>
                      </p>
                      <p className="text-sm text-muted-foreground/80 italic">{exercise.description}</p>
                    </div>
                  </EntityCard>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalMode && (
        <EntityEditModalShell
          title={modalTitle}
          description={isReadOnly ? undefined : "Preencha o essencial: nome, vídeo e instruções."}
          onClose={closeModal}
          className="max-w-3xl"
          footer={
            isReadOnly ? (
              <Button type="button" variant="outline" onClick={closeModal}>
                Fechar
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" form="exercise-edit-form">
                  Salvar exercício
                </Button>
              </>
            )
          }
        >
          <form id="exercise-edit-form" onSubmit={handleSubmit}>
            <fieldset disabled={isReadOnly} className="space-y-6">
              <TwoColumnFormLayout
                left={{
                  title: "Dados básicos",
                  children: (
                    <>
                      <p className="-mt-2 text-xs text-muted-foreground">
                        Identifique rapidamente o exercício.
                      </p>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium">
                          Nome <span className="text-destructive">*</span>
                        </span>
                        <Input
                          required
                          value={form.name}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium">Grupo muscular</span>
                        <Select
                          value={form.muscleGroup}
                          onValueChange={(value) =>
                            setForm((current) => ({ ...current, muscleGroup: value }))
                          }
                          disabled={isReadOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Grupo muscular" />
                          </SelectTrigger>
                          <SelectContent>
                            {MUSCLE_GROUPS.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="block space-y-2">
                        <span className="text-sm font-medium">Equipamento</span>
                        <Input
                          value={form.equipment}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, equipment: event.target.value }))
                          }
                        />
                      </label>
                    </>
                  ),
                }}
                right={{
                  title: "Vídeo demonstrativo",
                  children: (
                    <>
                      <p className="-mt-2 text-xs text-muted-foreground">
                        Cole um link do YouTube Shorts, YouTube, Vimeo ou MP4.
                      </p>
                      <VideoLinkField
                        url={form.videoUrl}
                        previewEmbedUrl={toEmbedUrl(form.videoUrl)}
                        onUpload={(file) =>
                          setForm((current) => ({ ...current, videoUrl: URL.createObjectURL(file) }))
                        }
                        onRemove={() => setForm((current) => ({ ...current, videoUrl: "" }))}
                      />
                    </>
                  ),
                }}
              />

              <div className="space-y-2 rounded-lg border border-border p-4">
                <div>
                  <h4 className="text-sm font-medium">Instruções do exercício</h4>
                  <p className="text-xs text-muted-foreground">
                    Explique de forma simples como executar corretamente.
                  </p>
                </div>
                <Textarea
                  className="min-h-32"
                  value={form.instructions}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, instructions: event.target.value }))
                  }
                />
              </div>
            </fieldset>
          </form>
        </EntityEditModalShell>
      )}

      {deletingExercise && (
        <EntityEditModalShell
          title="Excluir exercício"
          description={`Tem certeza que deseja excluir "${deletingExercise.name}"? Essa ação não pode ser desfeita.`}
          onClose={() => setDeletingExercise(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeletingExercise(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
                Excluir definitivamente
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
