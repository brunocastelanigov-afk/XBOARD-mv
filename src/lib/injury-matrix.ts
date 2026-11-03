// Matriz de lesão (Story 19.12 do treino-trinca-app): em quais lesões cada exercício NÃO deve ser alocado.
// Lógica pura (sem React) para o painel de impacto e para o aviso antes de salvar.

export const REGIOES_DE_LESAO = ["ombro", "joelho", "lombar", "cotovelo_punho", "quadril"] as const
export type RegiaoDeLesao = (typeof REGIOES_DE_LESAO)[number]

export const ROTULO_REGIAO: Record<RegiaoDeLesao, string> = {
  ombro: "Ombro",
  joelho: "Joelho",
  lombar: "Lombar",
  cotovelo_punho: "Cotovelo e punho",
  quadril: "Quadril",
}

export interface ExercicioDaMatriz {
  exerciseId: string
  slug: string
  nome: string
  grupoMuscular: string
  equipamento: string | null
  fatias: string[]
  riscos: RegiaoDeLesao[]
  riscosOrigem: "proposta" | "humano" | null
  riscosEditadoEm: string | null
  riscosEditadoPor: string | null
}

export interface MatrizDeLesaoResponse {
  regioes: RegiaoDeLesao[]
  exercicios: ExercicioDaMatriz[]
}

/** "posterior_joelho_deitado" -> "Posterior joelho deitado" */
export function rotuloDaFatia(fatia: string): string {
  const texto = fatia.replace(/_/g, " ")
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export interface ImpactoDaLesao {
  regiao: RegiaoDeLesao
  bloqueados: number
  total: number
  /** Fatias do playbook que ficam sem nenhum exercício liberado para quem tem a lesão. */
  fatiasSemExercicio: string[]
  /** Fatias que ficam com um único exercício liberado (pouca variedade). */
  fatiasComUm: string[]
}

/** O que sobra para um aluno com lesão em `regiao`, fatia por fatia. */
export function impactoDaLesao(exercicios: readonly ExercicioDaMatriz[], regiao: RegiaoDeLesao): ImpactoDaLesao {
  const liberadosPorFatia = new Map<string, number>()
  for (const e of exercicios) {
    for (const f of e.fatias) {
      liberadosPorFatia.set(f, (liberadosPorFatia.get(f) ?? 0) + (e.riscos.includes(regiao) ? 0 : 1))
    }
  }
  const fatias = [...liberadosPorFatia.entries()]
  return {
    regiao,
    bloqueados: exercicios.filter((e) => e.riscos.includes(regiao)).length,
    total: exercicios.length,
    fatiasSemExercicio: fatias.filter(([, n]) => n === 0).map(([f]) => f).sort(),
    fatiasComUm: fatias.filter(([, n]) => n === 1).map(([f]) => f).sort(),
  }
}

/** Fatias que ficariam SEM exercício liberado para `regiao` se `exercicio` passasse a bloquear essa região. */
export function fatiasQueEsvaziam(
  exercicios: readonly ExercicioDaMatriz[],
  exercicio: ExercicioDaMatriz,
  regiao: RegiaoDeLesao,
): string[] {
  return exercicio.fatias.filter((f) => {
    const liberados = exercicios.filter((e) => e.fatias.includes(f) && !e.riscos.includes(regiao))
    return liberados.length === 1 && liberados[0]?.exerciseId === exercicio.exerciseId
  })
}

/** Novo conjunto de riscos depois de marcar ou desmarcar uma região, na ordem canônica. */
export function alternarRisco(riscos: readonly RegiaoDeLesao[], regiao: RegiaoDeLesao): RegiaoDeLesao[] {
  const conjunto = new Set(riscos)
  if (conjunto.has(regiao)) conjunto.delete(regiao)
  else conjunto.add(regiao)
  return REGIOES_DE_LESAO.filter((r) => conjunto.has(r))
}
