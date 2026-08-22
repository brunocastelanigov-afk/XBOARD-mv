import { Dumbbell, FileStack } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { EmptyState } from "@/components/atoms/empty-state"
import { SearchInput } from "@/components/atoms/search-input"
import { cn } from "@/lib/utils"
import { useState } from "react"

export interface ProtocolEditorTemplateOption {
  id: string
  nome: string
  nivel: string
  objetivo: string
  categoria: string | null
}

interface ChoiceCardProps {
  icon: typeof FileStack
  title: string
  description: string
  disabled?: boolean
  onClick: () => void
}

function ChoiceCard({ icon: Icon, title, description, disabled, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/50 hover:bg-muted/40"
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="font-semibold text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  )
}

export interface ProtocolEditorChoiceCardsProps {
  canEditTreino: boolean
  onChooseProtocolo: () => void
  onChooseTreino: () => void
}

// Problema 02 (dev-acjustment): o card inicial de edição do protocolo de
// um aluno sempre pergunta primeiro qual das duas ações o admin quer —
// a lista de exercícios (ProgramExerciseEditor / modal "Editar treino
// individual") só deve aparecer se "Editar treino" for escolhido
// explicitamente aqui.
export function ProtocolEditorChoiceCards({
  canEditTreino,
  onChooseProtocolo,
  onChooseTreino,
}: ProtocolEditorChoiceCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ChoiceCard
        icon={FileStack}
        title="Editar protocolo"
        description="Troca qual protocolo (template) este aluno está seguindo."
        onClick={onChooseProtocolo}
      />
      <ChoiceCard
        icon={Dumbbell}
        title="Editar treino"
        description={
          canEditTreino
            ? "Ajusta os exercícios do protocolo atual deste aluno."
            : "Aluno ainda não tem um protocolo atual para editar."
        }
        disabled={!canEditTreino}
        onClick={onChooseTreino}
      />
    </div>
  )
}

export interface ProtocolTemplatePickerProps {
  templates: ProtocolEditorTemplateOption[]
  currentTemplateNome?: string | null
  saving: boolean
  error: string | null
  onSelect: (templateId: string) => void
}

function nivelLabel(value: string) {
  return value === "avancado" ? "Avançado" : value === "iniciante" ? "Iniciante" : value
}

function objetivoLabel(value: string) {
  if (value === "ganhar_musculo") return "Crescer"
  if (value === "ambos") return "Crescer e Secar"
  if (value === "secar") return "Secar"
  return value
}

// Migração de protocolo (Problema 01): lista os protocolos ativos pra
// escolher um novo para o aluno. Ao confirmar, chama
// POST /admin/users/:userId/program/assign — o backend sempre insere um
// programa NOVO (nunca edita o anterior), o que já dá o estado "novo
// protocolo" de graça no app do aluno (ver worker services/
// program-generation.ts assignTemplate()).
export function ProtocolTemplatePicker({
  templates,
  currentTemplateNome,
  saving,
  error,
  onSelect,
}: ProtocolTemplatePickerProps) {
  const [query, setQuery] = useState("")

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery
    ? templates.filter((template) => template.nome.toLowerCase().includes(normalizedQuery))
    : templates

  return (
    <div className="space-y-3">
      {currentTemplateNome && (
        <p className="text-sm text-muted-foreground">
          Protocolo atual: <span className="font-medium text-foreground">{currentTemplateNome}</span>
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <SearchInput value={query} onChange={setQuery} placeholder="Buscar protocolo pelo nome" />
      {filtered.length === 0 ? (
        <EmptyState icon={FileStack} message="Nenhum protocolo encontrado." />
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {filtered.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={saving}
              onClick={() => onSelect(template.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors",
                saving ? "cursor-not-allowed opacity-60" : "hover:border-primary/50 hover:bg-muted/40"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{template.nome}</p>
                <p className="text-xs text-muted-foreground">{template.categoria ? `Protocolo ${template.categoria}` : "Sem categoria"}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Badge variant="outline">{nivelLabel(template.nivel)}</Badge>
                <Badge variant="secondary">{objetivoLabel(template.objetivo)}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
