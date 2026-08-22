import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Copy, KeyRound, Loader2, SearchX, ShieldCheck, UserPlus } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import { PlanBadge, type Plan } from "@/components/atoms/plan-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { SearchInput } from "@/components/atoms/search-input"
import { Skeleton } from "@/components/atoms/skeleton"
import { ToggleButtonGroup } from "@/components/atoms/toggle-button-group"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { TwoColumnFormLayout } from "@/components/composites/two-column-form-layout"
import { adminMutation, adminRpc } from "@/lib/admin-api"

type SearchState = "idle" | "loading" | "found" | "not-found"
type CreateState = "idle" | "submitting" | "done"
type SaveState = "idle" | "saving" | "saved"

type Tier = "mvp" | "elite"

type AdminUserLookupRow = {
  user_id: string
  email: string
  nome_completo: string
  tier: Tier
  role: string
  is_active: boolean
  access_status: string
  revenue_net_cents: number
  created_at: string
}

type AdminUserMutationResponse = {
  userId: string
  email: string
  nomeCompleto: string
  tier: Tier
  role: string
  isActive: boolean
}

type TemporaryPasswordResponse =
  | { status: "issued"; temporaryPassword: string }
  | { status: "already_issued" }

interface LiberarUsuarioPageProps {
  canEdit?: boolean
}

function planToTier(plan: Plan): Tier {
  return plan === "elite" ? "elite" : "mvp"
}

function tierToPlan(tier: string): Plan {
  return tier === "elite" ? "elite" : "trinca"
}

function centsToCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação."
}

export function LiberarUsuarioPage({ canEdit: canEditProp }: LiberarUsuarioPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"

  const [createName, setCreateName] = useState("")
  const [createEmail, setCreateEmail] = useState("")
  const [createPlan, setCreatePlan] = useState<Plan>("trinca")
  const [createState, setCreateState] = useState<CreateState>("idle")
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdUser, setCreatedUser] = useState<AdminUserMutationResponse | null>(null)

  const [pendingRenewal, setPendingRenewal] = useState<{ userId: string; tier: Tier } | null>(null)
  const [renewState, setRenewState] = useState<SaveState>("idle")

  const [searchEmail, setSearchEmail] = useState("")
  const [searchState, setSearchState] = useState<SearchState>("idle")
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundAluno, setFoundAluno] = useState<AdminUserLookupRow | null>(null)
  const [editPlan, setEditPlan] = useState<Plan>("trinca")
  const [releaseState, setReleaseState] = useState<SaveState>("idle")
  const [passwordState, setPasswordState] = useState<SaveState>("idle")
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (createState !== "idle") return

    const email = createEmail.trim().toLowerCase()
    const nomeCompleto = createName.trim()
    const tier = planToTier(createPlan)

    setCreateState("submitting")
    setCreateError(null)
    setCreatedUser(null)

    try {
      const rows = await adminRpc<AdminUserLookupRow[]>("admin_user_lookup_by_email", { p_email: email })
      const existing = rows[0]

      if (existing && existing.is_active && existing.tier === tier) {
        setPendingRenewal({ userId: existing.user_id, tier })
        setCreateState("idle")
        return
      }

      let released: AdminUserMutationResponse
      if (existing) {
        released = await adminMutation<AdminUserMutationResponse>(`/admin/users/${existing.user_id}/release`, {
          method: "POST",
          body: { tier },
        })
      } else {
        const user = await adminMutation<AdminUserMutationResponse>("/admin/users", {
          method: "POST",
          body: { email, nomeCompleto, tier },
        })
        released = await adminMutation<AdminUserMutationResponse>(`/admin/users/${user.userId}/release`, {
          method: "POST",
          body: { tier },
        })
      }

      setCreatedUser(released)
      setCreateState("done")
      setCreateName("")
      setCreateEmail("")
      setCreatePlan("trinca")
    } catch (error) {
      setCreateError(errorMessage(error))
      setCreateState("idle")
    }
  }

  async function handleConfirmRenewal() {
    if (!pendingRenewal || renewState !== "idle") return
    setRenewState("saving")
    setCreateError(null)

    try {
      const released = await adminMutation<AdminUserMutationResponse>(
        `/admin/users/${pendingRenewal.userId}/release`,
        { method: "POST", body: { tier: pendingRenewal.tier } }
      )
      setCreatedUser(released)
      setCreateState("done")
      setCreateName("")
      setCreateEmail("")
      setCreatePlan("trinca")
      setRenewState("idle")
      setPendingRenewal(null)
    } catch (error) {
      setCreateError(errorMessage(error))
      setRenewState("idle")
      setPendingRenewal(null)
    }
  }

  function handleCancelRenewal() {
    setPendingRenewal(null)
  }

  async function handleSearch(value: string) {
    const query = value.trim().toLowerCase()
    if (!query) return

    setSearchState("loading")
    setFoundAluno(null)
    setTemporaryPassword(null)
    setSearchError(null)
    setReleaseState("idle")
    setPasswordState("idle")

    try {
      const rows = await adminRpc<AdminUserLookupRow[]>("admin_user_lookup_by_email", { p_email: query })
      const match = rows[0]
      if (!match) {
        setSearchState("not-found")
        return
      }
      setFoundAluno(match)
      setEditPlan(tierToPlan(match.tier))
      setSearchState("found")
    } catch (error) {
      setSearchError(errorMessage(error))
      setSearchState("idle")
    }
  }

  async function handleRelease() {
    if (!foundAluno || releaseState !== "idle") return

    const tier = planToTier(editPlan)
    setReleaseState("saving")
    setSearchError(null)

    try {
      const released = await adminMutation<AdminUserMutationResponse>(`/admin/users/${foundAluno.user_id}/release`, {
        method: "POST",
        body: { tier },
      })
      setFoundAluno((current) =>
        current
          ? {
              ...current,
              tier: released.tier,
              is_active: released.isActive,
              access_status: released.tier === "elite" ? "elite" : "trinca",
            }
          : current
      )
      setReleaseState("saved")
    } catch (error) {
      setSearchError(errorMessage(error))
      setReleaseState("idle")
    }
  }

  async function handleTemporaryPassword() {
    if (!foundAluno || passwordState !== "idle") return

    setPasswordState("saving")
    setTemporaryPassword(null)
    setSearchError(null)

    try {
      const response = await adminMutation<TemporaryPasswordResponse>(
        `/admin/users/${foundAluno.user_id}/password-temp`,
        { method: "POST" }
      )
      setTemporaryPassword(response.status === "issued" ? response.temporaryPassword : null)
      setPasswordState("saved")
    } catch (error) {
      setSearchError(errorMessage(error))
      setPasswordState("idle")
    }
  }

  async function handleCopyPassword() {
    if (!temporaryPassword) return
    await navigator.clipboard.writeText(temporaryPassword)
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader title="Liberar e editar usuário" className="items-start" />
        <p className="-mt-4 text-sm text-muted-foreground">
          Crie acessos manuais, libere plano e gere senha temporária usando o backend real.
        </p>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">Criação e liberação real de alunos</p>
              <p className="text-muted-foreground">
                Novos alunos são criados via Supabase Auth Admin no worker. Liberação e senha temporária usam
                `/admin/users` com chave de idempotência.
              </p>
            </div>
          </CardContent>
        </Card>

        {canEdit ? (
          <TwoColumnFormLayout
            left={{
              title: "Criar usuário",
              children: (
                <form className="flex flex-col gap-4" onSubmit={handleCreateSubmit}>
                  <p className="-mt-1 text-sm text-muted-foreground">
                    Para alunos que ainda não existem no app.
                  </p>
                  {createError && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {createError}
                    </p>
                  )}
                  {createdUser && (
                    <p className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-600">
                      Usuário criado e liberado: {createdUser.email}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Nome completo</p>
                    <Input
                      placeholder="Nome do aluno"
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase text-muted-foreground">E-mail do aluno</p>
                    <Input
                      type="email"
                      placeholder="aluno@email.com"
                      value={createEmail}
                      onChange={(event) => setCreateEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Plano</p>
                    <Select value={createPlan} onValueChange={(value) => setCreatePlan(value as Plan)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trinca">Trinca</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={createState === "submitting"}
                    className={createState === "done" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
                  >
                    {createState === "submitting" ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Criando...
                      </>
                    ) : createState === "done" ? (
                      <>
                        <Check />
                        Usuário criado e liberado
                      </>
                    ) : (
                      <>
                        <UserPlus />
                        Criar e liberar
                      </>
                    )}
                  </Button>
                </form>
              ),
            }}
            right={{
              title: "Editar usuário",
              children: (
                <div className="flex flex-col gap-4">
                  <p className="-mt-1 text-sm text-muted-foreground">
                    Busque por e-mail exato para liberar acesso ou gerar senha temporária.
                  </p>
                  {searchError && (
                    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {searchError}
                    </p>
                  )}
                  <SearchInput
                    placeholder="buscar@email.com"
                    value={searchEmail}
                    onChange={(value) => {
                      setSearchEmail(value)
                      if (searchState !== "idle") {
                        setSearchState("idle")
                        setFoundAluno(null)
                        setTemporaryPassword(null)
                        setReleaseState("idle")
                        setPasswordState("idle")
                      }
                    }}
                    onSearch={handleSearch}
                  />

                  {searchState === "loading" && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  )}

                  {searchState === "not-found" && (
                    <EmptyState icon={SearchX} message="Nenhum aluno encontrado com este e-mail." />
                  )}

                  {searchState === "found" && foundAluno && (
                    <div className="space-y-4 rounded-lg border border-border p-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{foundAluno.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{foundAluno.email}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <PlanBadge plan={tierToPlan(foundAluno.tier)} />
                        <Badge variant={foundAluno.is_active ? "secondary" : "outline"}>
                          {foundAluno.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline">{centsToCurrency(foundAluno.revenue_net_cents)}</Badge>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium uppercase text-muted-foreground">Plano para liberação</p>
                        <ToggleButtonGroup
                          options={[
                            { label: "Trinca", value: "trinca" },
                            { label: "Elite", value: "elite" },
                          ]}
                          value={editPlan}
                          onChange={(value) => {
                            setEditPlan(value as Plan)
                            setReleaseState("idle")
                          }}
                          columns={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          onClick={handleRelease}
                          disabled={releaseState === "saving"}
                          className={releaseState === "saved" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
                        >
                          {releaseState === "saving" ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Liberando...
                            </>
                          ) : releaseState === "saved" ? (
                            <>
                              <Check />
                              Liberado
                            </>
                          ) : (
                            "Liberar acesso"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTemporaryPassword}
                          disabled={passwordState === "saving"}
                        >
                          {passwordState === "saving" ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <KeyRound />
                              Gerar senha
                            </>
                          )}
                        </Button>
                      </div>

                      {passwordState === "saved" && (
                        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                          {temporaryPassword ? (
                            <>
                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                Senha temporária gerada
                              </p>
                              <div className="flex items-center gap-2">
                                <Input readOnly value={temporaryPassword} />
                                <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword}>
                                  <Copy className="size-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Esta chave de idempotência já foi processada; gere novamente para emitir outra senha.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            }}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <ShieldCheck className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Você não tem permissão para criar ou editar usuários.
              </p>
              <p className="text-sm text-muted-foreground">
                Fale com um administrador se precisar liberar ou ajustar o acesso de um aluno.
              </p>
            </CardContent>
          </Card>
        )}

        {pendingRenewal && (
          <EntityEditModalShell
            title="Usuário já possui este plano"
            description="Este e-mail já está ativo com o mesmo plano selecionado. Deseja renovar a data de vencimento dele agora?"
            onClose={handleCancelRenewal}
            footer={
              <>
                <Button type="button" variant="outline" onClick={handleCancelRenewal}>
                  Não
                </Button>
                <Button type="button" onClick={handleConfirmRenewal} disabled={renewState === "saving"}>
                  {renewState === "saving" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Renovando...
                    </>
                  ) : (
                    "Sim, renovar vencimento"
                  )}
                </Button>
              </>
            }
          />
        )}
      </div>
    </div>
  )
}
