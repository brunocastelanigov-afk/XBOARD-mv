import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Crown, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { EmptyState } from "@/components/atoms/empty-state"
import { Input } from "@/components/atoms/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Skeleton } from "@/components/atoms/skeleton"
import { Textarea } from "@/components/atoms/textarea"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"

interface Conquista {
  id: string
  title: string
  description: string
  xp: number
  metricLabel: string
  metricTarget?: number
  metricUnit?: string
}

const METRIC_OPTIONS = [
  "Total de treinos concluídos",
  "Dias desde o primeiro treino",
  "Frequência da semana (% de dias treinados em relação ao total)",
]

const MOCK_CONQUISTAS: Conquista[] = [
  {
    id: "elite-primeiro-passo-premium",
    title: "Elite: Primeiro passo premium",
    description:
      "Complete seu primeiro treino Elite e inicie sua jornada de alta performance.",
    xp: 250,
    metricLabel: "Total de treinos concluídos",
    metricTarget: 1,
  },
  {
    id: "parabens",
    title: "Parabéns!",
    description:
      "Você completou 1 semana de treino. Continue assim, seu objetivo está cada vez mais perto.",
    xp: 150,
    metricLabel: "Dias desde o primeiro treino",
    metricTarget: 7,
  },
  {
    id: "primeiro-treino-concluido",
    title: "Primeiro treino concluído",
    description: "Complete seu primeiro treino e comece sua jornada com energia.",
    xp: 100,
    metricLabel: "Total de treinos concluídos",
    metricTarget: 1,
  },
  {
    id: "elite-consistencia-azul",
    title: "Elite: Consistência azul",
    description: "Conclua 5 treinos e mostre que sua rotina entrou no padrão Elite.",
    xp: 500,
    metricLabel: "Total de treinos concluídos",
    metricTarget: 5,
  },
  {
    id: "sequencia-de-5-treinos",
    title: "Sequência de 5 treinos",
    description: "Conclua 5 treinos para provar sua consistência.",
    xp: 250,
    metricLabel: "Total de treinos concluídos",
    metricTarget: 5,
  },
  {
    id: "elite-frequencia-premium",
    title: "Elite: Frequência premium",
    description: "Mantenha uma semana forte de treinos e desbloqueie uma conquista exclusiva.",
    xp: 700,
    metricLabel: "Frequência da semana (% de dias treinados em relação ao total)",
    metricTarget: 100,
    metricUnit: "%",
  },
]

type SaveState = "idle" | "saving" | "saved"

interface ConquistasPageProps {
  canEdit?: boolean
}

export function ConquistasPage({ canEdit: canEditProp }: ConquistasPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const emptyForm = {
    name: "",
    description: "",
    metric: METRIC_OPTIONS[0],
    initialValue: "1",
    xp: "100",
  }

  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingAchievement, setDeletingAchievement] = useState<Conquista | null>(null)
  const [achievements, setAchievements] = useState<Conquista[]>(MOCK_CONQUISTAS)
  const [form, setForm] = useState(emptyForm)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const list = forceEmpty ? [] : achievements

  function handleNew() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function handleEdit(achievement: Conquista) {
    setEditingId(achievement.id)
    setForm({
      name: achievement.title,
      description: achievement.description,
      metric: achievement.metricLabel,
      initialValue: achievement.metricTarget !== undefined ? String(achievement.metricTarget) : "",
      xp: String(achievement.xp),
    })
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setSaveState("idle")
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saveState !== "idle") return
    setSaveState("saving")

    setTimeout(() => {
      const target = Number(form.initialValue)
      const metricTarget = Number.isFinite(target) && form.initialValue !== "" ? target : undefined

      if (editingId) {
        setAchievements((current) =>
          current.map((achievement) =>
            achievement.id === editingId
              ? {
                  ...achievement,
                  title: form.name || achievement.title,
                  description: form.description || achievement.description,
                  xp: Number(form.xp) || 0,
                  metricLabel: form.metric,
                  metricTarget,
                }
              : achievement
          )
        )
      } else {
        setAchievements((current) => [
          {
            id: `mock-${Date.now()}`,
            title: form.name || "Nova conquista",
            description: form.description || "Descrição motivacional da conquista.",
            xp: Number(form.xp) || 0,
            metricLabel: form.metric,
            metricTarget,
          },
          ...current,
        ])
      }

      setSaveState("saved")
      setTimeout(() => {
        handleCloseForm()
      }, 700)
    }, 700)
  }

  function handleConfirmDelete() {
    if (!deletingAchievement) return
    setAchievements((current) =>
      current.filter((achievement) => achievement.id !== deletingAchievement.id)
    )
    setDeletingAchievement(null)
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader
          title="Conquistas"
          className="items-start"
          actions={
            canEdit
              ? [
                  {
                    label: "Nova conquista",
                    icon: Plus,
                    onClick: handleNew,
                  },
                ]
              : []
          }
        />
        <p className="-mt-4 text-sm text-muted-foreground">
          Crie e gerencie conquistas exclusivas para alunos Elite.
        </p>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Crown className="size-4 text-primary" />
            Conquistas disponíveis apenas para o Elite
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <Badge variant="accent" className="gap-1">
                <Crown className="size-3" />
                Modelos Elite
              </Badge>
              <CardTitle className="text-base">Conquistas premium de alta performance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Modelos com XP maior, visual premium e metas para alunos Elite.
              </p>
            </div>
            <Button type="button" disabled title="Em breve">
              Adicionar modelos
            </Button>
          </CardContent>
        </Card>

        {canEdit && formOpen && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-base">
                {editingId ? "Editar conquista" : "Nova conquista"}
              </CardTitle>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleCloseForm}
                disabled={saveState === "saving"}
              >
                Fechar
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                <Input
                  placeholder="Nome da conquista"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
                <Textarea
                  placeholder="Descrição motivacional"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <Select value="elite" disabled>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Elite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={form.metric}
                    onValueChange={(value) => setForm((current) => ({ ...current, metric: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Valor inicial/alvo"
                    value={form.initialValue}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, initialValue: event.target.value }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="XP concedido"
                    value={form.xp}
                    onChange={(event) => setForm((current) => ({ ...current, xp: event.target.value }))}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saveState !== "idle"}
                  className={saveState === "saved" ? "bg-green-600 hover:bg-green-600 text-white" : undefined}
                >
                  {saveState === "saving" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Salvando...
                    </>
                  ) : saveState === "saved" ? (
                    <>
                      <Check />
                      Salvo!
                    </>
                  ) : editingId ? (
                    "Salvar alterações"
                  ) : (
                    "Salvar conquista"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Card key={index}>
                <CardContent className="flex items-start gap-3 p-0">
                  <Skeleton className="size-9 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={Crown} message="Nenhuma conquista cadastrada ainda." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {list.map((achievement) => (
              <EntityCard
                key={achievement.id}
                title={achievement.title}
                icon={Crown}
                badges={[{ label: `+${achievement.xp} XP`, variant: "accent" }]}
                actions={
                  canEdit
                    ? [
                        { icon: Pencil, onClick: () => handleEdit(achievement), label: "Editar" },
                        {
                          icon: Trash2,
                          onClick: () => setDeletingAchievement(achievement),
                          label: `Excluir "${achievement.title}"`,
                          variant: "destructive",
                        },
                      ]
                    : []
                }
              >
                <p className="mb-3 text-sm text-muted-foreground">{achievement.description}</p>
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{achievement.metricLabel}</span>
                  {achievement.metricTarget !== undefined && (
                    <span className="font-medium">
                      Meta: {achievement.metricTarget}
                      {achievement.metricUnit ?? ""}
                    </span>
                  )}
                </div>
              </EntityCard>
            ))}
          </div>
        )}
      </div>

      {deletingAchievement && (
        <EntityEditModalShell
          title="Excluir conquista"
          description={`Tem certeza que deseja excluir "${deletingAchievement.title}"? Essa ação não pode ser desfeita.`}
          onClose={() => setDeletingAchievement(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeletingAchievement(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
                Excluir definitivamente
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
