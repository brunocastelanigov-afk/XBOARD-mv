// O programa do aluno só guarda o NOME do template, e há vários templates com o
// mesmo nome (nível e sexo diferentes). Os RPCs do dashboard não devolvem o
// protocol_template_id, então o modelo é identificado pelos exercícios de cada dia.

interface SignatureDay {
  ordem: number
  exercises: { ordem: number; id: string }[]
}

export function exerciseSignature(days: SignatureDay[]): string {
  return [...days]
    .sort((a, b) => a.ordem - b.ordem)
    .map((day) =>
      [...day.exercises]
        .sort((a, b) => a.ordem - b.ordem)
        .map((exercise) => exercise.id)
        .join(",")
    )
    .join("/")
}

export function templateSignature(
  days: { ordem: number; exercises: { ordem: number; exercise_id: string }[] }[]
): string {
  return exerciseSignature(
    days.map((day) => ({
      ordem: day.ordem,
      exercises: day.exercises.map((e) => ({ ordem: e.ordem, id: e.exercise_id })),
    }))
  )
}

// Usa `exercicios` (join com workout_day_exercises): `exercicios_snapshot` não tem exercise_id.
export function programSignature(
  days: { ordem: number; exercicios: { ordem: number; exercise_id: string }[] }[]
): string {
  return exerciseSignature(
    days.map((day) => ({
      ordem: day.ordem,
      exercises: day.exercicios.map((e) => ({ ordem: e.ordem, id: e.exercise_id })),
    }))
  )
}

/**
 * Template do programa atual, ou undefined quando não dá para afirmar qual é.
 * Com nome único, o nome basta (cobre treino editado individualmente). Com nome
 * repetido, só vale a correspondência única de exercícios.
 */
export function findCurrentTemplate<T extends { nome: string; signature: string }>(
  templates: T[],
  nome: string,
  currentSignature: string | null | undefined
): T | undefined {
  const sameName = templates.filter((template) => template.nome === nome)
  if (sameName.length <= 1) return sameName[0]
  const sameExercises = sameName.filter((template) => template.signature === currentSignature)
  return sameExercises.length === 1 ? sameExercises[0] : undefined
}
