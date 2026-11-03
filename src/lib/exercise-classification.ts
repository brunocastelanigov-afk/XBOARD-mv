import { REGIOES_DE_LESAO, type RegiaoDeLesao } from "@/lib/injury-matrix"

// Classificação do exercício para a geração de treino por IA (Story 19.12 do treino-trinca-app). Exercício novo nasce
// PENDENTE: a IA só o usa depois de classificado por uma pessoa (fatia, pesado, complexo, tipo, dificuldade, regiões
// trabalhadas e riscos de lesão).

/** Grupos de força: os únicos que a IA usa como exercício de treino (aquecimento e cardio têm regras próprias). */
export const GRUPOS_DE_FORCA = ["Abdômen", "Pernas", "Costas", "Peito", "Ombros", "Bíceps", "Tríceps", "Panturrilhas", "Lombar"] as const

export const ehGrupoDeForca = (grupo: string) => (GRUPOS_DE_FORCA as readonly string[]).includes(grupo.trim())

export const REGIOES_TRABALHADAS = [
  { valor: "peito", rotulo: "Peito" },
  { valor: "costas", rotulo: "Costas" },
  { valor: "ombro_anterior", rotulo: "Ombro (anterior)" },
  { valor: "ombro_lateral", rotulo: "Ombro (lateral)" },
  { valor: "ombro_posterior", rotulo: "Ombro (posterior)" },
  { valor: "biceps", rotulo: "Bíceps" },
  { valor: "triceps", rotulo: "Tríceps" },
  { valor: "abdomen", rotulo: "Abdômen" },
  { valor: "quadriceps", rotulo: "Quadríceps" },
  { valor: "gluteo", rotulo: "Glúteo" },
  { valor: "posterior", rotulo: "Posterior de coxa" },
  { valor: "adutores", rotulo: "Adutores" },
  { valor: "panturrilha", rotulo: "Panturrilha" },
  { valor: "lombar", rotulo: "Lombar" },
] as const

export const TIPOS_DE_EXERCICIO = [
  { valor: "composto", rotulo: "Composto (várias articulações)" },
  { valor: "isolador", rotulo: "Isolador (uma articulação)" },
] as const

export const DIFICULDADES = [
  { valor: "iniciante", rotulo: "Iniciante" },
  { valor: "intermediario", rotulo: "Intermediário" },
  { valor: "avancado", rotulo: "Avançado" },
] as const

export interface Classificacao {
  fatias: string[]
  pesado: boolean
  complexo: boolean
  queimacao: boolean
  tipo: string
  dificuldade: string
  regioes: string[]
  riscos: RegiaoDeLesao[]
}

export const CLASSIFICACAO_VAZIA: Classificacao = {
  fatias: [],
  pesado: false,
  complexo: false,
  queimacao: false,
  tipo: "",
  dificuldade: "",
  regioes: [],
  riscos: [],
}

/** O que falta para o exercício de força poder ser usado pela IA (lista vazia = completo). */
export function camposFaltando(c: Classificacao, grupo: string): string[] {
  if (!ehGrupoDeForca(grupo)) return []
  const falta: string[] = []
  if (!c.tipo) falta.push("tipo")
  if (!c.dificuldade) falta.push("dificuldade")
  if (c.regioes.length === 0) falta.push("regiões trabalhadas")
  return falta
}

export function mudou(a: Classificacao, b: Classificacao): boolean {
  const igual = (x: readonly string[], y: readonly string[]) => [...x].sort().join("|") === [...y].sort().join("|")
  return (
    a.pesado !== b.pesado ||
    a.complexo !== b.complexo ||
    a.queimacao !== b.queimacao ||
    a.tipo !== b.tipo ||
    a.dificuldade !== b.dificuldade ||
    !igual(a.fatias, b.fatias) ||
    !igual(a.regioes, b.regioes)
  )
}

export const riscosMudaram = (a: Classificacao, b: Classificacao) =>
  [...a.riscos].sort().join("|") !== [...b.riscos].sort().join("|")

export { REGIOES_DE_LESAO }
