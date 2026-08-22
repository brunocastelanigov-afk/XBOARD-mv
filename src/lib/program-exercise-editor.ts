export interface ProgramExercise {
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

export interface ProgramDayRow {
  workout_day_id: string
  ordem: number
  nome: string
  foco: string | null
  status: string
  imagem_url?: string | null
  exercicios_snapshot: ProgramExercise[] | null
  exercicios: ProgramExercise[]
}

export interface ProgramDetailRow {
  user_id: string
  program_id: string | null
  program_nome: string | null
  program_foco: string | null
  status_geracao: string | null
  program_created_at: string | null
  days: ProgramDayRow[]
}

export interface AdminExerciseCatalogRow {
  exercise_id: string
  nome: string
  grupo_muscular: string
  video_url: string | null
  instrucao_texto: string | null
}

export interface ProgramFormExercise {
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
}

export interface ProgramFormDay {
  workoutDayId: string
  nome: string
  foco: string
  imagemUrl: string
  exercicios: ProgramFormExercise[]
}

// Add/remove sempre renumeram ordem 1..N sequencial pela posição no
// array — nunca reaproveitam o ordem antigo dos itens restantes. Sem isso,
// remover o item 1 deixa o resto começando em 2, e adicionar depois de
// remoções no meio da lista pode duplicar ou pular números.
export function renumbered<T extends { ordem: number }>(items: T[]): T[] {
  return items.map((item, index) => (item.ordem === index + 1 ? item : { ...item, ordem: index + 1 }))
}

export function buildProgramFormDays(detail: ProgramDetailRow): ProgramFormDay[] {
  return detail.days.map((day) => {
    // exercicios_snapshot (cache denormalizado) tem nome/series/reps/
    // descanso mas NUNCA teve exercise_id — só o array `exercicios`
    // (join real com workout_day_exercises) tem o id de verdade e os
    // overrides de video/instrucao/observacoes. Sem esse merge por ordem,
    // exerciseId fica undefined e o payload de salvar perde exerciseId.
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
  })
}

export function programPayload(days: ProgramFormDay[]) {
  return {
    days: days.map((day) => ({
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

export function exerciseCatalogToSearchGroups(catalog: AdminExerciseCatalogRow[], query: string) {
  const grouped = new Map<string, { id: string; label: string }[]>()
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

export function youtubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/
  )
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}
