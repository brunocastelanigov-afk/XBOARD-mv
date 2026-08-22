import { DragDropProvider } from "@dnd-kit/react"
import { isSortable } from "@dnd-kit/react/sortable"
import { Plus } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import { StepperInput } from "@/components/atoms/stepper-input"
import { LinkedEntitySearchList } from "@/components/composites/linked-entity-search-list"
import { ReorderableListItem } from "@/components/composites/reorderable-list-item"
import {
  exerciseCatalogToSearchGroups,
  youtubeEmbedUrl,
  type AdminExerciseCatalogRow,
  type ProgramFormDay,
} from "@/lib/program-exercise-editor"

export interface ProgramExerciseEditorProps {
  days: ProgramFormDay[]
  exerciseCatalog: AdminExerciseCatalogRow[]
  expandedExerciseKey: string | null
  onExpandExercise: (key: string | null) => void
  exercisePickerQuery: string
  onExercisePickerQueryChange: (value: string) => void
  onAddExercise: (dayIndex: number) => void
  onUpdateExercise: (
    dayIndex: number,
    exerciseIndex: number,
    patch: Partial<ProgramFormDay["exercicios"][number]>
  ) => void
  onRemoveExerciseRequest: (dayIndex: number, exerciseIndex: number, exerciseNome: string) => void
  onReorderExercises: (dayIndex: number, fromIndex: number, toIndex: number) => void
  onSelectExercise: (dayIndex: number, exerciseIndex: number, option: { exercise_id: string; nome: string }) => void
}

export function ProgramExerciseEditor({
  days,
  exerciseCatalog,
  expandedExerciseKey,
  onExpandExercise,
  exercisePickerQuery,
  onExercisePickerQueryChange,
  onAddExercise,
  onUpdateExercise,
  onRemoveExerciseRequest,
  onReorderExercises,
  onSelectExercise,
}: ProgramExerciseEditorProps) {
  return (
    <>
      {days.map((day, dayIndex) => (
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
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Nome, foco e imagem do treino (somente leitura — edite pelo protocolo geral)
                </p>
                <p className="text-sm font-medium text-foreground">{day.nome || "Sem nome"}</p>
                {day.foco && <p className="text-sm text-muted-foreground">{day.foco}</p>}
                {day.imagemUrl.trim() && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={day.imagemUrl}
                    alt=""
                    className="h-24 w-full rounded-md border border-border object-cover"
                  />
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Exercícios
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {day.exercicios.length} item(ns) na ordem de execução
                    </span>
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => onAddExercise(dayIndex)}>
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
                      onReorderExercises(dayIndex, source.initialIndex, source.index)
                    }}
                  >
                    <div className="space-y-2">
                      {day.exercicios.map((exercise, exerciseIndex) => {
                        const exerciseKey = exercise.key
                        const exerciseExpanded = expandedExerciseKey === exerciseKey
                        const catalogEntry = exerciseCatalog.find(
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
                              onRemove={() => onRemoveExerciseRequest(dayIndex, exerciseIndex, exercise.nome)}
                              onExpand={() => {
                                onExpandExercise(exerciseExpanded ? null : exerciseKey)
                                onExercisePickerQueryChange("")
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
                                      onQueryChange={onExercisePickerQueryChange}
                                      groups={exerciseCatalogToSearchGroups(exerciseCatalog, exercisePickerQuery)}
                                      onSelect={(item) =>
                                        onSelectExercise(dayIndex, exerciseIndex, {
                                          exercise_id: item.id,
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
                                          onUpdateExercise(dayIndex, exerciseIndex, { series: value || null })
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
                                          onUpdateExercise(dayIndex, exerciseIndex, {
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
                                          onUpdateExercise(dayIndex, exerciseIndex, { descansoSegundos: value })
                                        }
                                      />
                                    </label>
                                  </div>

                                  {(effectiveVideoUrl || effectiveInstrucao) && (
                                    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                                      <p className="text-xs font-medium uppercase text-muted-foreground">
                                        Vídeo e instruções do exercício (somente leitura — edite pela aba Exercícios)
                                      </p>
                                      {effectiveVideoUrl && (
                                        <p className="truncate text-sm text-foreground">Vídeo: {effectiveVideoUrl}</p>
                                      )}
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
                                      {effectiveInstrucao && (
                                        <p className="text-sm text-foreground">Como executar: {effectiveInstrucao}</p>
                                      )}
                                    </div>
                                  )}
                                  {exercise.observacoes && (
                                    <div className="space-y-1 rounded-md border border-border bg-muted/20 p-3">
                                      <p className="text-xs font-medium uppercase text-muted-foreground">
                                        Observações e cuidados (somente leitura)
                                      </p>
                                      <p className="text-sm text-foreground">{exercise.observacoes}</p>
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
        </div>
      ))}
    </>
  )
}
