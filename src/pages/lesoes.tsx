import { useEffect, useMemo, useState } from "react"
import { ShieldAlert } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { EmptyState } from "@/components/atoms/empty-state"
import { SearchInput } from "@/components/atoms/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select"
import { Skeleton } from "@/components/atoms/skeleton"
import { CategoryPillFilter } from "@/components/composites/category-pill-filter"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { Checkbox } from "@/components/ui/checkbox"
import { AdminApiError, adminMutation, adminRead } from "@/lib/admin-crm-api"
import {
  REGIOES_DE_LESAO,
  ROTULO_REGIAO,
  alternarRisco,
  fatiasQueEsvaziam,
  impactoDaLesao,
  rotuloDaFatia,
  type ExercicioDaMatriz,
  type MatrizDeLesaoResponse,
  type RegiaoDeLesao,
} from "@/lib/injury-matrix"

const TODOS = "Todos"
const SEM_FOCO = "__nenhum__"

function mensagemDeErro(error: unknown) {
  if (error instanceof AdminApiError) {
    if (error.status === 403) return "Só administradores podem editar a matriz de lesão."
    return error.message
  }
  return error instanceof Error ? error.message : "Erro inesperado."
}

function formatarData(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export function LesoesPage() {
  const [exercicios, setExercicios] = useState<ExercicioDaMatriz[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState("")
  const [grupo, setGrupo] = useState(TODOS)
  const [foco, setFoco] = useState<string>(SEM_FOCO)
  const [soHumano, setSoHumano] = useState(false)

  useEffect(() => {
    let cancelado = false
    adminRead<MatrizDeLesaoResponse>("/admin/exercises/injury-matrix")
      .then((dados) => {
        if (!cancelado) setExercicios(dados.exercicios)
      })
      .catch((e: unknown) => {
        if (!cancelado) setErro(mensagemDeErro(e))
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const grupos = useMemo(
    () => [TODOS, ...Array.from(new Set(exercicios.map((e) => e.grupoMuscular))).sort((a, b) => a.localeCompare(b, "pt-BR"))],
    [exercicios],
  )

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return exercicios.filter((e) => {
      if (grupo !== TODOS && e.grupoMuscular !== grupo) return false
      if (termo && !e.nome.toLowerCase().includes(termo)) return false
      if (soHumano && e.riscosOrigem !== "humano") return false
      if (foco !== SEM_FOCO && !e.riscos.includes(foco as RegiaoDeLesao)) return false
      return true
    })
  }, [exercicios, busca, grupo, soHumano, foco])

  const impacto = useMemo(
    () => (foco === SEM_FOCO ? null : impactoDaLesao(exercicios, foco as RegiaoDeLesao)),
    [exercicios, foco],
  )

  async function alternar(exercicio: ExercicioDaMatriz, regiao: RegiaoDeLesao) {
    const novosRiscos = alternarRisco(exercicio.riscos, regiao)
    const vaiBloquear = !exercicio.riscos.includes(regiao)
    if (vaiBloquear) {
      const esvaziam = fatiasQueEsvaziam(exercicios, exercicio, regiao)
      if (
        esvaziam.length > 0 &&
        !window.confirm(
          `Bloquear "${exercicio.nome}" para lesão em ${ROTULO_REGIAO[regiao].toLowerCase()} deixa sem nenhum exercício: ${esvaziam
            .map(rotuloDaFatia)
            .join(", ")}. O gerador vai relaxar a faixa de volume dessa região para esses alunos. Continuar?`,
        )
      ) {
        return
      }
    }

    setErro(null)
    setAviso(null)
    const anterior = exercicio
    const otimista: ExercicioDaMatriz = { ...exercicio, riscos: novosRiscos, riscosOrigem: "humano" }
    setExercicios((atual) => atual.map((e) => (e.exerciseId === exercicio.exerciseId ? otimista : e)))
    setSalvando((atual) => new Set(atual).add(exercicio.exerciseId))
    try {
      const resposta = await adminMutation<{ riscos: RegiaoDeLesao[]; riscosOrigem: "humano"; riscosEditadoEm: string }>(
        `/admin/exercises/${exercicio.exerciseId}/injury-risks`,
        { method: "PUT", body: { riscos: novosRiscos } },
      )
      setExercicios((atual) =>
        atual.map((e) =>
          e.exerciseId === exercicio.exerciseId
            ? { ...e, riscos: resposta.riscos, riscosOrigem: "humano", riscosEditadoEm: resposta.riscosEditadoEm }
            : e,
        ),
      )
      setAviso(`"${exercicio.nome}" atualizado. Vale para as próximas gerações (em até 5 minutos); programas já gravados não mudam.`)
    } catch (e) {
      setExercicios((atual) => atual.map((x) => (x.exerciseId === exercicio.exerciseId ? anterior : x)))
      setErro(mensagemDeErro(e))
    } finally {
      setSalvando((atual) => {
        const proximo = new Set(atual)
        proximo.delete(exercicio.exerciseId)
        return proximo
      })
    }
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EntityListHeader title="Matriz de lesão" className="items-start" />
        <p className="-mt-3 max-w-3xl text-sm text-muted-foreground">
          Marque as lesões em que o exercício <strong>não deve ser alocado</strong>. O gerador de treino por IA retira o exercício
          do aluno que reportar dor naquela região. Sem nenhuma marca, o exercício é liberado para toda lesão.
        </p>

        {erro && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        )}
        {aviso && (
          <p role="status" className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {aviso}
          </p>
        )}

        <div className="sticky top-0 z-10 space-y-3 bg-background pb-3 pt-1">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <SearchInput placeholder="Buscar exercício..." value={busca} onChange={setBusca} />
            </div>
            <Select value={foco} onValueChange={setFoco}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Ver por lesão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_FOCO}>Todas as lesões</SelectItem>
                {REGIOES_DE_LESAO.map((r) => (
                  <SelectItem key={r} value={r}>
                    Bloqueados em {ROTULO_REGIAO[r].toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={soHumano} onCheckedChange={(v) => setSoHumano(v === true)} aria-label="Só editados por humano" />
              Só editados por humano
            </label>
          </div>
          <CategoryPillFilter options={grupos} active={grupo} onChange={setGrupo} />
        </div>

        {impacto && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm" data-testid="painel-impacto">
            <p className="font-medium">
              Aluno com lesão em {ROTULO_REGIAO[impacto.regiao].toLowerCase()}: {impacto.bloqueados} de {impacto.total} exercícios bloqueados
            </p>
            <p className="mt-2 text-muted-foreground">
              Fatias do playbook sem nenhum exercício liberado:{" "}
              {impacto.fatiasSemExercicio.length > 0 ? (
                <span className="text-destructive">{impacto.fatiasSemExercicio.map(rotuloDaFatia).join(", ")}</span>
              ) : (
                "nenhuma"
              )}
            </p>
            <p className="mt-1 text-muted-foreground">
              Fatias com um único exercício liberado:{" "}
              {impacto.fatiasComUm.length > 0 ? impacto.fatiasComUm.map(rotuloDaFatia).join(", ") : "nenhuma"}
            </p>
          </div>
        )}

        {carregando ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <EmptyState icon={ShieldAlert} message="Nenhum exercício encontrado." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Exercício</th>
                  {REGIOES_DE_LESAO.map((r) => (
                    <th key={r} className="px-3 py-2 text-center font-medium">
                      {ROTULO_REGIAO[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((e) => {
                  const ocupado = salvando.has(e.exerciseId)
                  const editado = formatarData(e.riscosEditadoEm)
                  return (
                    <tr key={e.exerciseId} className="border-t border-border">
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{e.nome}</span>
                          <Badge variant="outline">{e.grupoMuscular}</Badge>
                          {e.riscosOrigem === "humano" ? (
                            <Badge variant="accent" title={editado ? `Editado em ${editado}` : undefined}>
                              humano
                            </Badge>
                          ) : (
                            <Badge variant="secondary" title="Proposta automática, ainda não revisada por uma pessoa">
                              proposta
                            </Badge>
                          )}
                        </div>
                        {e.fatias.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{e.fatias.map(rotuloDaFatia).join(" · ")}</p>
                        )}
                      </td>
                      {REGIOES_DE_LESAO.map((r) => (
                        <td key={r} className="px-3 py-2 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={e.riscos.includes(r)}
                              disabled={ocupado}
                              onCheckedChange={() => void alternar(e, r)}
                              aria-label={`${e.nome}: evitar em lesão de ${ROTULO_REGIAO[r].toLowerCase()}`}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
