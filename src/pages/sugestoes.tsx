import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Loader2, MessageSquareText } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { EmptyState } from "@/components/atoms/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { SearchInput } from "@/components/atoms/search-input"
import { Skeleton } from "@/components/atoms/skeleton"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { adminMutation, adminRpc } from "@/lib/admin-crm-api"

type SuggestionStatus = "nova" | "revisada" | "implementada"

const ALL = "__all__"

interface AdminSuggestionRow {
  suggestion_id: string
  user_id: string
  user_name: string
  user_email: string
  texto: string
  status: SuggestionStatus
  created_at: string
  cursor_created_at: string
  cursor_suggestion_id: string
}

interface AdminSuggestionStatusUpdateResponse {
  status: "ok"
  mutationId: string
  idempotencyKey: string
  affectedIds: string[]
  suggestionStatus: SuggestionStatus
}

const statusLabel: Record<SuggestionStatus, string> = {
  nova: "Nova",
  revisada: "Revisada",
  implementada: "Implementada",
}

const statusClassName: Record<SuggestionStatus, string> = {
  nova: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  revisada: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  implementada: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return dateTimeFormatter.format(new Date(value))
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

interface SugestoesPageProps {
  canEdit?: boolean
}

export function SugestoesPage({ canEdit: canEditProp }: SugestoesPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceLoading = searchParams.get("loading") === "1"
  const forceEmpty = searchParams.get("empty") === "1"

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AdminSuggestionRow[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<SuggestionStatus | typeof ALL>(ALL)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadSuggestions() {
    setLoading(true)
    setLoadError(null)
    try {
      const rows = await adminRpc<AdminSuggestionRow[]>("admin_suggestions_list", { p_limit: 100 })
      setSuggestions(rows)
    } catch (error) {
      setSuggestions([])
      setLoadError(errorMessage(error, "Erro ao carregar sugestões."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (forceLoading) return
    void loadSuggestions()
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const visibleSuggestions = forceEmpty ? [] : suggestions

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return visibleSuggestions.filter((suggestion) => {
      if (
        term &&
        !suggestion.user_name.toLowerCase().includes(term) &&
        !suggestion.user_email.toLowerCase().includes(term) &&
        !suggestion.texto.toLowerCase().includes(term)
      ) {
        return false
      }
      if (status !== ALL && suggestion.status !== status) return false
      return true
    })
  }, [visibleSuggestions, search, status])

  async function updateStatus(suggestion: AdminSuggestionRow, nextStatus: SuggestionStatus) {
    if (savingId) return
    setSavingId(suggestion.suggestion_id)
    setActionError(null)

    try {
      const response = await adminMutation<AdminSuggestionStatusUpdateResponse>(
        `/admin/suggestions/${suggestion.suggestion_id}/status`,
        { method: "PATCH", body: { status: nextStatus } }
      )
      setSuggestions((current) =>
        current.map((item) =>
          item.suggestion_id === suggestion.suggestion_id ? { ...item, status: response.suggestionStatus } : item
        )
      )
    } catch (error) {
      setActionError(errorMessage(error, "Erro ao classificar sugestão."))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EntityListHeader title="Sugestões" count={visibleSuggestions.length} className="items-start" />

        {loadError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </p>
        )}

        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              placeholder="Buscar sugestão..."
              value={search}
              onChange={setSearch}
              className="w-full lg:w-[300px]"
            />
            <Select value={status} onValueChange={(value) => setStatus(value as SuggestionStatus | typeof ALL)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os status</SelectItem>
                <SelectItem value="nova">Nova</SelectItem>
                <SelectItem value="revisada">Revisada</SelectItem>
                <SelectItem value="implementada">Implementada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            Mostrando {filtered.length} de {visibleSuggestions.length}
          </span>
        </div>

        {actionError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        )}

        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquareText} message="Nenhuma sugestão encontrada." />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((suggestion) => (
              <EntityCard
                key={suggestion.suggestion_id}
                title={suggestion.user_name}
                metadata={[suggestion.user_email, formatDateTime(suggestion.created_at)]}
                badges={[
                  {
                    label: statusLabel[suggestion.status],
                    variant: "outline",
                    className: statusClassName[suggestion.status],
                  },
                ]}
              >
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{suggestion.texto}</p>
                  {canEdit && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {(["nova", "revisada", "implementada"] as SuggestionStatus[]).map((option) => (
                        <Button
                          key={option}
                          type="button"
                          size="sm"
                          variant={suggestion.status === option ? "default" : "outline"}
                          disabled={savingId === suggestion.suggestion_id || suggestion.status === option}
                          onClick={() => updateStatus(suggestion, option)}
                        >
                          {savingId === suggestion.suggestion_id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : suggestion.status === option ? (
                            <Check className="size-3.5" />
                          ) : null}
                          {statusLabel[option]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </EntityCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
