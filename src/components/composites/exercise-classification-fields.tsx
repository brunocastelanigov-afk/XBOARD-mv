import { Badge } from "@/components/atoms/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DIFICULDADES,
  REGIOES_TRABALHADAS,
  TIPOS_DE_EXERCICIO,
  camposFaltando,
  ehGrupoDeForca,
  type Classificacao,
} from "@/lib/exercise-classification"
import { REGIOES_DE_LESAO, ROTULO_REGIAO, rotuloDaFatia, type RegiaoDeLesao } from "@/lib/injury-matrix"

interface Props {
  grupo: string
  value: Classificacao
  onChange: (next: Classificacao) => void
  fatiasDoGrupo: readonly string[]
  readOnly?: boolean
  /** Origem do metadado atual (edição): humano ou proposta. Sem valor = exercício novo. */
  fonte?: "humano" | "proposta" | null
  pendente?: boolean
}

const seletor = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"

/** Seção "Playbook do treino por IA": fatia, pesado, complexo, queimação, tipo, dificuldade, regiões e riscos de lesão. */
export function ExerciseClassificationFields({ grupo, value, onChange, fatiasDoGrupo, readOnly, fonte, pendente }: Props) {
  const set = (parcial: Partial<Classificacao>) => onChange({ ...value, ...parcial })
  const alternar = <T extends string>(lista: readonly T[], item: T, ligado: boolean): T[] =>
    ligado ? [...lista, item] : lista.filter((x) => x !== item)

  if (!ehGrupoDeForca(grupo)) {
    return (
      <div className="rounded-lg border border-border p-4" data-testid="secao-playbook">
        <h4 className="text-sm font-medium">Playbook do treino por IA</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {grupo.trim() ? "Este grupo não é de força: aquecimento e cardio seguem regras próprias, sem classificação." : "Escolha o grupo muscular para classificar o exercício."}
        </p>
      </div>
    )
  }

  const faltando = camposFaltando(value, grupo)

  return (
    <div className="space-y-4 rounded-lg border border-border p-4" data-testid="secao-playbook">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">Playbook do treino por IA</h4>
          <p className="text-xs text-muted-foreground">
            O gerador só usa o exercício depois de classificado. Sem isso, ele fica pendente e a IA não o escolhe.
          </p>
        </div>
        {pendente ? (
          <Badge variant="destructive">pendente</Badge>
        ) : fonte === "humano" ? (
          <Badge variant="accent">humano</Badge>
        ) : fonte === "proposta" ? (
          <Badge variant="secondary" title="Proposta automática, ainda não revisada por uma pessoa">
            proposta
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Tipo {!readOnly && <span className="text-destructive">*</span>}</span>
          <select className={seletor} value={value.tipo} disabled={readOnly} onChange={(e) => set({ tipo: e.target.value })} aria-label="Tipo do exercício">
            <option value="">Selecione...</option>
            {TIPOS_DE_EXERCICIO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Dificuldade {!readOnly && <span className="text-destructive">*</span>}</span>
          <select className={seletor} value={value.dificuldade} disabled={readOnly} onChange={(e) => set({ dificuldade: e.target.value })} aria-label="Dificuldade">
            <option value="">Selecione...</option>
            {DIFICULDADES.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Fatia</span>
        {fatiasDoGrupo.length === 0 ? (
          <p className="text-xs text-muted-foreground">Este grupo muscular não usa fatias.</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {fatiasDoGrupo.map((fatia) => (
              <label key={fatia} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.fatias.includes(fatia)}
                  disabled={readOnly}
                  onCheckedChange={(c) => set({ fatias: alternar(value.fatias, fatia, c === true) })}
                  aria-label={`Fatia ${rotuloDaFatia(fatia)}`}
                />
                {rotuloDaFatia(fatia)}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">
          Regiões trabalhadas {!readOnly && <span className="text-destructive">*</span>}
          <span className="ml-2 text-xs font-normal text-muted-foreground">entram na conta do volume semanal</span>
        </span>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {REGIOES_TRABALHADAS.map((r) => (
            <label key={r.valor} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.regioes.includes(r.valor)}
                disabled={readOnly}
                onCheckedChange={(c) => set({ regioes: alternar(value.regioes, r.valor, c === true) })}
                aria-label={`Região ${r.rotulo}`}
              />
              {r.rotulo}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">
          Evitar em lesão de
          <span className="ml-2 text-xs font-normal text-muted-foreground">sem marca = liberado para toda lesão</span>
        </span>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {REGIOES_DE_LESAO.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.riscos.includes(r)}
                disabled={readOnly}
                onCheckedChange={(c) => set({ riscos: alternar<RegiaoDeLesao>(value.riscos, r, c === true) })}
                aria-label={`Evitar em lesão de ${ROTULO_REGIAO[r].toLowerCase()}`}
              />
              {ROTULO_REGIAO[r]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={value.pesado} disabled={readOnly} onCheckedChange={(c) => set({ pesado: c === true })} aria-label="Pesado" />
          <span>
            Pesado
            <span className="block text-xs text-muted-foreground">Composto pesado: 6 a 8 repetições e 90 a 120 s de intervalo no avançado.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={value.complexo} disabled={readOnly} onCheckedChange={(c) => set({ complexo: c === true })} aria-label="Complexo" />
          <span>
            Complexo
            <span className="block text-xs text-muted-foreground">Técnica exigente: o iniciante não recebe este exercício.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={value.queimacao} disabled={readOnly} onCheckedChange={(c) => set({ queimacao: c === true })} aria-label="Queimação" />
          <span>
            Queimação
            <span className="block text-xs text-muted-foreground">Exercício de alta repetição (15 a 20) do treino feminino.</span>
          </span>
        </label>
      </div>

      {!readOnly && faltando.length > 0 && (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground" role="note">
          Para a IA poder usar este exercício, falta: {faltando.join(", ")}. Sem isso ele é salvo como pendente.
        </p>
      )}
    </div>
  )
}
