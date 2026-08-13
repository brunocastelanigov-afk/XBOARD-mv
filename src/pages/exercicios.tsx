import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Dumbbell, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import { SearchInput } from "@/components/atoms/search-input"
import { Skeleton } from "@/components/atoms/skeleton"
import { Textarea } from "@/components/atoms/textarea"
import { CategoryPillFilter } from "@/components/composites/category-pill-filter"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { TwoColumnFormLayout } from "@/components/composites/two-column-form-layout"
import { AdminApiError, adminMutation, adminRpc } from "@/lib/admin-crm-api"
import { cn } from "@/lib/utils"

const ALL_CATEGORIES_LABEL = "Todos"
const PAGE_SIZE = 100

const TONE_CLASSES = [
  { badge: "border-rose-500/30 bg-rose-500/10 text-rose-500", bar: "border-l-rose-500" },
  { badge: "border-amber-500/30 bg-amber-500/10 text-amber-500", bar: "border-l-amber-500" },
  { badge: "border-blue-500/30 bg-blue-500/10 text-blue-500", bar: "border-l-blue-500" },
  { badge: "border-violet-500/30 bg-violet-500/10 text-violet-500", bar: "border-l-violet-500" },
  { badge: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500", bar: "border-l-fuchsia-500" },
  { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", bar: "border-l-emerald-500" },
  { badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-500", bar: "border-l-indigo-500" },
  { badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500", bar: "border-l-cyan-500" },
]

const VIDEO_BADGE_CLASS = "border-sky-500/30 bg-sky-500/10 text-sky-500"

interface AdminExerciseRow {
  exercise_id: string
  slug: string
  nome: string
  grupo_muscular: string
  equipamento: string | null
  video_url: string | null
  instrucao_texto: string | null
  is_active: boolean
  cursor_nome: string
  cursor_exercise_id: string
}

interface AdminExerciseResponse {
  exerciseId: string
  slug: string
  nome: string
  grupoMuscular: string
  equipamento: string | null
  videoUrl: string | null
  instrucaoTexto: string | null
  isActive: boolean
}

interface AffectedTemplate {
  templateId: string
  nome: string
  nivel: string
  objetivo: string
  status: string
}

interface InactivateExerciseResponse extends AdminExerciseResponse {
  affectedTemplates?: AffectedTemplate[]
}

interface Exercise {
  id: string
  slug: string
  name: string
  muscleGroup: string
  equipment: string
  instructions: string
  videoUrl: string
  isActive: boolean
  cursorName: string
  cursorExerciseId: string
}

interface ExerciseFormState {
  name: string
  muscleGroup: string
  equipment: string
  instructions: string
  videoUrl: string
}

function rowToExercise(row: AdminExerciseRow): Exercise {
  return {
    id: row.exercise_id,
    slug: row.slug,
    name: row.nome,
    muscleGroup: row.grupo_muscular,
    equipment: row.equipamento ?? "",
    instructions: row.instrucao_texto ?? "",
    videoUrl: row.video_url ?? "",
    isActive: row.is_active,
    cursorName: row.cursor_nome,
    cursorExerciseId: row.cursor_exercise_id,
  }
}

function responseToExercise(row: AdminExerciseResponse): Exercise {
  return {
    id: row.exerciseId,
    slug: row.slug,
    name: row.nome,
    muscleGroup: row.grupoMuscular,
    equipment: row.equipamento ?? "",
    instructions: row.instrucaoTexto ?? "",
    videoUrl: row.videoUrl ?? "",
    isActive: row.isActive,
    cursorName: row.nome,
    cursorExerciseId: row.exerciseId,
  }
}

function toFormState(exercise: Exercise | null): ExerciseFormState {
  if (!exercise) {
    return {
      name: "",
      muscleGroup: "",
      equipment: "",
      instructions: "",
      videoUrl: "",
    }
  }
  return {
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    instructions: exercise.instructions,
    videoUrl: exercise.videoUrl,
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

function categoryTone(category: string) {
  const hash = Array.from(category).reduce((total, char) => total + char.charCodeAt(0), 0)
  return TONE_CLASSES[hash % TONE_CLASSES.length]
}

function errorMessage(error: unknown) {
  if (error instanceof AdminApiError) {
    return error.message
  }
  return error instanceof Error ? error.message : "Nao foi possivel concluir a operacao."
}

type ModalMode = "create" | "edit" | "view" | null
type SaveState = "idle" | "saving" | "saved"

interface ExerciciosPageProps {
  canEdit?: boolean
}

export function ExerciciosPage({ canEdit: canEditProp }: ExerciciosPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES_LABEL)
  const [hasMore, setHasMore] = useState(false)
  const [lastCursor, setLastCursor] = useState<{ nome: string; exerciseId: string } | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ExerciseFormState>(toFormState(null))
  const [formError, setFormError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [inactivationNotice, setInactivationNotice] = useState<string | null>(null)

  const categoryOptions = useMemo(() => [ALL_CATEGORIES_LABEL, ...categories], [categories])

  async function loadCategories() {
    const rows = await adminRpc<AdminExerciseRow[]>("admin_exercises_list", {
      p_is_active: true,
      p_limit: PAGE_SIZE,
    })
    setCategories(
      Array.from(new Set(rows.map((row) => row.grupo_muscular).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      )
    )
  }

  async function loadExercises(options: { append?: boolean } = {}) {
    const append = options.append ?? false
    if (append) {
      if (!lastCursor || loadingMore) return
      setLoadingMore(true)
    } else {
      setLoading(true)
      setLastCursor(null)
    }
    setError(null)

    try {
      const params: Record<string, unknown> = {
        p_is_active: true,
        p_limit: PAGE_SIZE,
      }
      const trimmedSearch = search.trim()
      if (trimmedSearch) params.p_search_name_prefix = trimmedSearch
      if (activeCategory !== ALL_CATEGORIES_LABEL) params.p_grupo_muscular = activeCategory
      if (append && lastCursor) {
        params.p_after_nome = lastCursor.nome
        params.p_after_exercise_id = lastCursor.exerciseId
      }

      const rows = await adminRpc<AdminExerciseRow[]>("admin_exercises_list", params)
      const nextExercises = rows.map(rowToExercise)
      setExercises((current) => (append ? [...current, ...nextExercises] : nextExercises))
      const last = nextExercises.at(-1)
      setLastCursor(last ? { nome: last.cursorName, exerciseId: last.cursorExerciseId } : null)
      setHasMore(rows.length === PAGE_SIZE)
    } catch (loadError) {
      setError(errorMessage(loadError))
      if (!append) setExercises([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void loadCategories().catch((loadError) => setError(errorMessage(loadError)))
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadExercises()
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [search, activeCategory])

  const isLoading = loading
  const isFiltered = search.trim() !== "" || activeCategory !== ALL_CATEGORIES_LABEL

  function matchesCurrentFilters(exercise: Exercise) {
    const trimmedSearch = search.trim().toLowerCase()
    const matchesSearch = !trimmedSearch || exercise.name.toLowerCase().startsWith(trimmedSearch)
    const matchesCategory = activeCategory === ALL_CATEGORIES_LABEL || exercise.muscleGroup === activeCategory
    return matchesSearch && matchesCategory
  }

  function openNewModal() {
    setEditingId(null)
    setForm(toFormState(null))
    setFormError(null)
    setSaveState("idle")
    setModalMode("create")
  }

  function openEditModal(exercise: Exercise) {
    setEditingId(exercise.id)
    setForm(toFormState(exercise))
    setFormError(null)
    setSaveState("idle")
    setModalMode("edit")
  }

  function openViewModal(exercise: Exercise) {
    setEditingId(exercise.id)
    setForm(toFormState(exercise))
    setFormError(null)
    setModalMode("view")
  }

  function closeModal() {
    setModalMode(null)
    setEditingId(null)
    setFormError(null)
    setSaveState("idle")
  }

  async function handleConfirmDelete() {
    if (!deletingExercise || deleteLoading) return
    setDeleteLoading(true)
    setError(null)
    setInactivationNotice(null)
    try {
      const response = await adminMutation<InactivateExerciseResponse>(
        `/admin/exercises/${deletingExercise.id}`,
        { method: "DELETE" }
      )
      const affectedTemplates = response.affectedTemplates ?? []
      if (affectedTemplates.length > 0) {
        setInactivationNotice(
          `Exercicio inativado. Templates afetados: ${affectedTemplates.map((template) => template.nome).join(", ")}.`
        )
      } else {
        setInactivationNotice("Exercicio inativado sem templates afetados retornados pelo contrato.")
      }
      setExercises((current) => current.filter((exercise) => exercise.id !== deletingExercise.id))
      setDeletingExercise(null)
      void loadCategories()
    } catch (deleteError) {
      setError(errorMessage(deleteError))
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saveState !== "idle") return

    const payload = {
      nome: form.name.trim(),
      grupoMuscular: form.muscleGroup.trim(),
      equipamento: form.equipment.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      instrucaoTexto: form.instructions.trim() || undefined,
    }

    setFormError(null)
    setSaveState("saving")

    try {
      const saved = editingId
        ? await adminMutation<AdminExerciseResponse>(`/admin/exercises/${editingId}`, {
            method: "PATCH",
            body: payload,
          })
        : await adminMutation<AdminExerciseResponse>("/admin/exercises", {
            method: "POST",
            body: payload,
          })

      const nextExercise = responseToExercise(saved)
      setExercises((current) => {
        if (editingId) {
          return matchesCurrentFilters(nextExercise)
            ? current.map((exercise) => (exercise.id === editingId ? nextExercise : exercise))
            : current.filter((exercise) => exercise.id !== editingId)
        }
        return matchesCurrentFilters(nextExercise) ? [nextExercise, ...current] : current
      })
      setSaveState("saved")
      void loadCategories()
      window.setTimeout(closeModal, 700)
    } catch (submitError) {
      setFormError(errorMessage(submitError))
      setSaveState("idle")
    }
  }

  const isReadOnly = modalMode === "view"
  const modalTitle =
    modalMode === "create" ? "Novo exercicio" : modalMode === "view" ? "Exercicio" : "Editar exercicio"

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EntityListHeader
          title="Exercícios"
          className="items-start"
          actions={canEdit ? [{ label: "Novo Exercício", icon: Plus, onClick: openNewModal }] : []}
        />
        <div className="-mt-3 text-sm text-muted-foreground">
          {isLoading ? <Skeleton className="h-4 w-24" /> : `${exercises.length} exercicios ativos`}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {inactivationNotice && (
          <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {inactivationNotice}
          </p>
        )}

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
              options={categoryOptions}
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
        ) : exercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            message={
              isFiltered ? "Nenhum exercício encontrado." : "Nenhum exercício cadastrado ainda."
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {exercises.map((exercise) => {
              const tone = categoryTone(exercise.muscleGroup)
              return (
                <div
                  key={exercise.id}
                  onClick={!canEdit ? () => openViewModal(exercise) : undefined}
                  className={cn(!canEdit && "cursor-pointer")}
                >
                  <EntityCard
                    title={exercise.name}
                    titleClassName="text-base font-semibold tracking-tight"
                    className={cn("border-l-4 transition-shadow hover:shadow-md", tone.bar)}
                    badges={[
                      { label: exercise.muscleGroup, variant: "outline", className: tone.badge },
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
                              label: `Inativar "${exercise.name}"`,
                              variant: "destructive",
                            },
                          ]
                        : []
                    }
                  >
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground/90">
                        Equipamento:{" "}
                        <span className="font-normal text-muted-foreground">
                          {exercise.equipment || "Nao informado"}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground/80 italic">
                        {exercise.instructions || "Sem instrucoes cadastradas."}
                      </p>
                    </div>
                  </EntityCard>
                </div>
              )
            })}
          </div>
        )}

        {!isLoading && hasMore && (
          <div className="flex justify-center pt-1">
            <Button type="button" variant="outline" disabled={loadingMore} onClick={() => void loadExercises({ append: true })}>
              {loadingMore ? (
                <>
                  <Loader2 className="animate-spin" />
                  Carregando...
                </>
              ) : (
                "Carregar mais"
              )}
            </Button>
          </div>
        )}
      </div>

      {modalMode && (
        <EntityEditModalShell
          title={modalTitle}
          description={isReadOnly ? undefined : "Preencha nome, grupo muscular, vídeo e instruções."}
          onClose={closeModal}
          className="max-w-3xl"
          footer={
            isReadOnly ? (
              <Button type="button" variant="outline" onClick={closeModal}>
                Fechar
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={saveState !== "idle"} onClick={closeModal}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="exercise-edit-form"
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
                      Salvo!
                    </>
                  ) : (
                    "Salvar exercício"
                  )}
                </Button>
              </>
            )
          }
        >
          <form id="exercise-edit-form" onSubmit={handleSubmit}>
            <fieldset disabled={isReadOnly || saveState !== "idle"} className="space-y-6">
              {formError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}

              <TwoColumnFormLayout
                left={{
                  title: "Dados básicos",
                  children: (
                    <>
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
                        <span className="text-sm font-medium">
                          Grupo muscular <span className="text-destructive">*</span>
                        </span>
                        <Input
                          required
                          list="exercise-muscle-groups"
                          value={form.muscleGroup}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, muscleGroup: event.target.value }))
                          }
                        />
                        <datalist id="exercise-muscle-groups">
                          {categories.map((group) => (
                            <option key={group} value={group} />
                          ))}
                        </datalist>
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
                      <label className="block space-y-2">
                        <span className="text-sm font-medium">URL do vídeo</span>
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={form.videoUrl}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, videoUrl: event.target.value }))
                          }
                        />
                      </label>
                      {toEmbedUrl(form.videoUrl) ? (
                        <div className="aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                          <iframe
                            src={toEmbedUrl(form.videoUrl)}
                            className="h-full w-full"
                            allowFullScreen
                            title="Preview do vídeo"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground">
                          Sem preview
                        </div>
                      )}
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
          title="Inativar exercício"
          description={`Tem certeza que deseja inativar "${deletingExercise.name}"? Ele nao sera removido fisicamente e programas ja gerados continuam legiveis pelo snapshot existente.`}
          onClose={() => setDeletingExercise(null)}
          footer={
            <>
              <Button type="button" variant="outline" disabled={deleteLoading} onClick={() => setDeletingExercise(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" disabled={deleteLoading} onClick={handleConfirmDelete}>
                {deleteLoading ? "Inativando..." : "Inativar exercício"}
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
