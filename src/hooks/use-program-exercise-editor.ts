import { useState } from "react"
import { arrayMove } from "@dnd-kit/helpers"

import { renumbered, type ProgramFormDay } from "@/lib/program-exercise-editor"

export function useProgramExerciseEditor(initialDays: ProgramFormDay[]) {
  const [days, setDays] = useState<ProgramFormDay[]>(initialDays)

  function resetDays(nextDays: ProgramFormDay[]) {
    setDays(nextDays)
  }

  function updateExercise(
    dayIndex: number,
    exerciseIndex: number,
    patch: Partial<ProgramFormDay["exercicios"][number]>
  ) {
    setDays((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? {
              ...day,
              exercicios: day.exercicios.map((exercise, currentExerciseIndex) =>
                currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise
              ),
            }
          : day
      )
    )
  }

  function addExercise(dayIndex: number, fallback: { exercise_id: string; nome: string }) {
    setDays((current) =>
      current.map((day, currentDayIndex) =>
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
      )
    )
  }

  function removeExercise(dayIndex: number, exerciseIndex: number) {
    setDays((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? { ...day, exercicios: renumbered(day.exercicios.filter((_, index) => index !== exerciseIndex)) }
          : day
      )
    )
  }

  function reorderExercises(dayIndex: number, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    setDays((current) =>
      current.map((day, currentDayIndex) =>
        currentDayIndex === dayIndex
          ? { ...day, exercicios: renumbered(arrayMove(day.exercicios, fromIndex, toIndex)) }
          : day
      )
    )
  }

  function selectExercise(dayIndex: number, exerciseIndex: number, option: { exercise_id: string; nome: string }) {
    // Troca de exercício sempre limpa os overrides do exercício anterior —
    // vídeo/como-executar exibidos passam a vir do cadastro real do novo
    // exercício até um override explícito ser digitado para ele.
    updateExercise(dayIndex, exerciseIndex, {
      exerciseId: option.exercise_id,
      nome: option.nome,
      videoUrlOverride: "",
      instrucaoTextoOverride: "",
    })
  }

  return { days, resetDays, updateExercise, addExercise, removeExercise, reorderExercises, selectExercise }
}
