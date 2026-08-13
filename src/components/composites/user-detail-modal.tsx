import * as React from "react"
import {
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Dumbbell,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  NotebookPen,
  RefreshCcw,
  Ruler,
  Scale,
  Shield,
} from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { ToggleButtonGroup, type ToggleButtonGroupOption } from "@/components/atoms/toggle-button-group"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { adminMutation } from "@/lib/admin-api"
import { cn } from "@/lib/utils"

type AdminTemporaryPasswordResponse =
  | { status: "issued"; temporaryPassword: string }
  | { status: "already_issued" }

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação."
}

export type UserDetailTopStatus = "reembolsada" | "vencendo" | "sem_acesso" | null

export interface UserDetailCargaItem {
  exercicio: string
  cargaAtual: string
}

export interface UserDetailQuizAnswer {
  pergunta: string
  resposta: string
}

export interface UserDetail {
  id: string
  name: string
  email: string
  topStatus: UserDetailTopStatus
  protocolo: {
    liberado: boolean
    mensagem: string
    detalhe?: string
  }
  perfilFisico: {
    idade: number
    sexo: string
    peso: number
    altura: number
    categoria?: string
  }
  acessoGestao: {
    plano: "trinca" | "elite"
    cargo: "aluno" | "suporte" | "treinador" | "administrador"
    status: string
    acesso: string
    compra: string
    assinatura: string
    vencimento?: string
    diasRestantes?: string
  }
  avaliacao: {
    objetivo?: string
    nivelFinanceiro?: string
    avaliacaoInicial: string
    cardVisualizado: boolean
    preferenciaTreino?: string
    lemaPessoal?: string
  }
  treinos: {
    concluidos?: string
    frequenciaLabel: string
    frequenciaPercent: number
  }
  reavaliacao: {
    definida: boolean
    data?: string
  }
  cargas: UserDetailCargaItem[]
  quiz: {
    nome: string
    concluidoEm: string
    respostas: UserDetailQuizAnswer[]
  }
}

const PLANO_OPTIONS: ToggleButtonGroupOption[] = [
  { label: "⚡ Liberar Trinca", value: "trinca" },
  { label: "👑 Elite", value: "elite" },
]

const CARGO_OPTIONS: ToggleButtonGroupOption[] = [
  { label: "Aluno", value: "aluno" },
  { label: "Suporte", value: "suporte" },
  { label: "Treinador", value: "treinador" },
  { label: "Administrador", value: "administrador" },
]

const TOP_STATUS_LABEL: Record<Exclude<UserDetailTopStatus, null>, string> = {
  reembolsada: "REEMBOLSADA",
  vencendo: "VENCENDO",
  sem_acesso: "SEM ACESSO",
}

function FieldRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value ?? "—"}</span>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2 rounded-lg border border-border p-4", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

interface UserDetailModalProps {
  user: UserDetail
  canEdit?: boolean
  onClose: () => void
}

type PasswordSaveState = "idle" | "loading" | "saved"
type TempPasswordState = "idle" | "loading"

export function UserDetailModal({ user, canEdit = true, onClose }: UserDetailModalProps) {
  const [plano, setPlano] = React.useState(user.acessoGestao.plano)
  const [cargo, setCargo] = React.useState(user.acessoGestao.cargo)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordSaveState, setPasswordSaveState] = React.useState<PasswordSaveState>("idle")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [tempPasswordState, setTempPasswordState] = React.useState<TempPasswordState>("idle")
  const [temporaryPassword, setTemporaryPassword] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (passwordSaveState !== "saved") return
    const timeout = setTimeout(() => setPasswordSaveState("idle"), 1600)
    return () => clearTimeout(timeout)
  }, [passwordSaveState])

  async function handleChangePassword() {
    if (passwordSaveState !== "idle") return
    setPasswordError(null)

    if (newPassword.length < 6) {
      setPasswordError("A senha precisa ter no mínimo 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.")
      return
    }

    setPasswordSaveState("loading")
    try {
      await adminMutation<{ status: "updated" }>(`/admin/users/${user.id}/password`, {
        method: "POST",
        body: { password: newPassword },
      })
      setNewPassword("")
      setConfirmPassword("")
      setPasswordSaveState("saved")
    } catch (error) {
      setPasswordError(errorMessage(error))
      setPasswordSaveState("idle")
    }
  }

  async function handleGenerateTemporaryPassword() {
    if (tempPasswordState !== "idle") return
    setPasswordError(null)
    setTempPasswordState("loading")
    try {
      const response = await adminMutation<AdminTemporaryPasswordResponse>(
        `/admin/users/${user.id}/password-temp`,
        { method: "POST" }
      )
      setTemporaryPassword(response.status === "issued" ? response.temporaryPassword : null)
    } catch (error) {
      setPasswordError(errorMessage(error))
    } finally {
      setTempPasswordState("idle")
    }
  }

  async function handleCopyTemporaryPassword() {
    if (!temporaryPassword) return
    await navigator.clipboard.writeText(temporaryPassword)
  }

  return (
    <EntityEditModalShell
      title={user.name}
      description={user.email}
      onClose={onClose}
      className="max-w-3xl"
      footer={
        <Button type="button" variant="outline" onClick={onClose} className="w-full">
          Fechar
        </Button>
      }
    >
      {user.topStatus && (
        <Badge variant="destructive" className="gap-1">
          🚫 {TOP_STATUS_LABEL[user.topStatus]}
        </Badge>
      )}

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados" className="gap-1.5">
            <ClipboardList className="size-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="cargas" className="gap-1.5">
            <Scale className="size-4" />
            Cargas
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-1.5">
            <NotebookPen className="size-4" />
            Respostas do Quiz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              user.protocolo.liberado
                ? "border-green-500/30 bg-green-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md",
                user.protocolo.liberado ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500"
              )}
            >
              <CheckCircle2 className="size-4" />
            </span>
            <div className="space-y-0.5">
              <p className={cn("font-semibold", user.protocolo.liberado ? "text-green-500" : "text-amber-500")}>
                {user.protocolo.liberado ? "Protocolo Liberado ✓" : "Protocolo Pendente"}
              </p>
              <p className="text-sm text-foreground">{user.protocolo.mensagem}</p>
              {user.protocolo.detalhe && (
                <p className="text-xs text-muted-foreground">{user.protocolo.detalhe}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section icon={Mail} title="Cadastro">
              <FieldRow label="Nome" value={user.name} />
              <FieldRow label="E-mail" value={user.email} />
            </Section>
            <Section icon={Ruler} title="Perfil físico">
              <FieldRow label="Idade" value={`${user.perfilFisico.idade} anos`} />
              <FieldRow label="Sexo" value={user.perfilFisico.sexo} />
              <FieldRow label="Peso" value={`${user.perfilFisico.peso} kg`} />
              <FieldRow label="Altura" value={`${user.perfilFisico.altura} cm`} />
              <FieldRow label="Categoria" value={user.perfilFisico.categoria} />
            </Section>
          </div>

          <Section icon={Shield} title="Acesso & Gestão">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-sm text-muted-foreground">Plano</span>
                {canEdit ? (
                  <ToggleButtonGroup options={PLANO_OPTIONS} value={plano} onChange={(v) => setPlano(v as typeof plano)} columns={2} />
                ) : (
                  <Badge variant={plano === "elite" ? "accent" : "secondary"}>
                    {plano === "elite" ? "👑 Elite" : "⚡ Trinca"}
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5">
                <span className="text-sm text-muted-foreground">Cargo</span>
                {canEdit ? (
                  <ToggleButtonGroup options={CARGO_OPTIONS} value={cargo} onChange={(v) => setCargo(v as typeof cargo)} columns={2} />
                ) : (
                  <Badge variant="secondary" className="capitalize">
                    {cargo}
                  </Badge>
                )}
              </div>
            </div>
            <FieldRow label="Status" value={user.acessoGestao.status} />
            <FieldRow label="Acesso" value={user.acessoGestao.acesso} />
            <FieldRow label="Compra" value={user.acessoGestao.compra} />
            <FieldRow label="Assinatura" value={user.acessoGestao.assinatura} />
            <FieldRow label="Vencimento" value={user.acessoGestao.vencimento} />
            <FieldRow label="Dias restantes" value={user.acessoGestao.diasRestantes} />
          </Section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section icon={ClipboardCheck} title="Avaliação">
              <FieldRow label="Objetivo" value={user.avaliacao.objetivo} />
              <FieldRow label="Nível financeiro" value={user.avaliacao.nivelFinanceiro} />
              <FieldRow label="Avaliação inicial" value={user.avaliacao.avaliacaoInicial} />
              <FieldRow
                label="Card da avaliação"
                value={
                  <Badge
                    variant="outline"
                    className={cn(
                      user.avaliacao.cardVisualizado
                        ? "border-green-500/40 bg-green-500/10 text-green-400"
                        : "border-red-500/40 bg-red-500/10 text-red-400"
                    )}
                  >
                    {user.avaliacao.cardVisualizado ? "Visualizou" : "Não visualizou"}
                  </Badge>
                }
              />
              <FieldRow label="Preferência de treino" value={user.avaliacao.preferenciaTreino} />
              <FieldRow label="Lema pessoal" value={user.avaliacao.lemaPessoal} />
            </Section>
            <Section icon={Dumbbell} title="Treinos">
              <FieldRow label="Treinos concluídos" value={user.treinos.concluidos} />
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-current" />
                {user.treinos.frequenciaLabel} ({user.treinos.frequenciaPercent}%)
              </Badge>
            </Section>
          </div>

          <Section icon={Calendar} title="Reavaliação">
            {user.reavaliacao.definida ? (
              <p className="text-sm text-foreground">{user.reavaliacao.data}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Não definido</p>
            )}
            {canEdit && (
              <Button type="button" variant="link" size="sm" className="h-auto gap-1.5 p-0">
                <Calendar className="size-3.5" />
                Definir data de reavaliação
              </Button>
            )}
          </Section>

          {canEdit && (
            <Section icon={KeyRound} title="Alterar senha do aluno">
              <p className="text-sm text-muted-foreground">
                A senha atual fica criptografada e não pode ser exibida. Gere ou defina uma nova senha e informe ao
                aluno.
              </p>
              {passwordError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {passwordError}
                </p>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  disabled={tempPasswordState !== "idle"}
                  onClick={() => void handleGenerateTemporaryPassword()}
                >
                  {tempPasswordState === "loading" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="size-3.5" />
                  )}
                  Gerar senha temporária
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  disabled={!temporaryPassword}
                  onClick={() => void handleCopyTemporaryPassword()}
                >
                  <Copy className="size-3.5" />
                  Copiar senha
                </Button>
              </div>
              {temporaryPassword && (
                <Input readOnly value={temporaryPassword} className="font-mono" />
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Nova senha</span>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-9"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Confirmar nova senha</span>
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
              </div>
              <Button
                type="button"
                className={cn("w-full gap-1.5", passwordSaveState === "saved" && "bg-green-600 hover:bg-green-600 text-white")}
                disabled={passwordSaveState !== "idle" || newPassword.length === 0 || confirmPassword.length === 0}
                onClick={() => void handleChangePassword()}
              >
                {passwordSaveState === "loading" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Alterando...
                  </>
                ) : passwordSaveState === "saved" ? (
                  <>
                    <Check className="size-3.5" />
                    Senha alterada!
                  </>
                ) : (
                  <>
                    <KeyRound className="size-3.5" />
                    Alterar senha
                  </>
                )}
              </Button>
            </Section>
          )}
        </TabsContent>

        <TabsContent value="cargas">
          <EntityCard
            icon={Dumbbell}
            title="CARGAS"
            metadata={[`${user.cargas.length} exercício${user.cargas.length === 1 ? "" : "s"} rastreado${user.cargas.length === 1 ? "" : "s"}`]}
            expandable
          >
            {user.cargas.length === 0 ? (
              <EmptyState icon={Dumbbell} message="Nenhuma carga registrada" />
            ) : (
              <div className="space-y-2">
                {user.cargas.map((item) => (
                  <FieldRow key={item.exercicio} label={item.exercicio} value={item.cargaAtual} />
                ))}
              </div>
            )}
          </EntityCard>
        </TabsContent>

        <TabsContent value="quiz" className="space-y-4">
          <Badge className="block w-fit rounded-lg px-3 py-2 text-left">
            <span className="block font-semibold">{user.quiz.nome}</span>
            <span className="block text-xs font-normal opacity-80">
              {user.quiz.concluidoEm} · {user.quiz.respostas.length} resposta(s)
            </span>
          </Badge>
          <div className="space-y-2 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardList className="size-4" />
              {user.quiz.nome}
              <span className="text-xs font-normal text-muted-foreground">Concluído em {user.quiz.concluidoEm}</span>
            </div>
            <div className="space-y-2">
              {user.quiz.respostas.map((answer, index) => (
                <FieldRow key={index} label={answer.pergunta} value={answer.resposta} />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </EntityEditModalShell>
  )
}
