import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowDown, ArrowUp, BookOpen, FlaskConical, ListChecks, Plus, Trash2 } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { Textarea } from "@/components/atoms/textarea"
import { Badge } from "@/components/atoms/badge"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { FieldReferenceTable } from "@/components/composites/field-reference-table"
import { OverrideRuleCard } from "@/components/composites/override-rule-card"
import { QuickProfileButtonGrid, type QuickProfile } from "@/components/composites/quick-profile-button-grid"

interface RuleCondition {
  field: string
  operator: string
  value: string
}

interface OverrideRule {
  id: string
  priority: number
  name: string
  conditions: RuleCondition[]
  result: string
  program?: string
  override: boolean
  active: boolean
  description?: string
}

const FIELD_OPTIONS = [
  "experiencia",
  "idade",
  "dor_saude",
  "treinando",
  "objetivo",
  "urgencia",
  "gasto_mensal",
  "genero",
]

const OPERATOR_OPTIONS = [
  { value: "igual a", label: "= igual a" },
  { value: ">=", label: ">= maior ou igual" },
  { value: "<=", label: "<= menor ou igual" },
]

const LEVEL_OPTIONS = ["Iniciante", "Intermediário", "Avançado"]

const MOCK_RULES: OverrideRule[] = [
  {
    id: "iniciante-experiencia",
    priority: 1,
    name: "Iniciante por Experiência",
    conditions: [{ field: "experiencia", operator: "igual a", value: "iniciante" }],
    result: "Iniciante",
    override: false,
    active: true,
    description: "Usuários sem experiência ou com menos de 6 meses.",
  },
  {
    id: "forcar-iniciante-idade",
    priority: 2,
    name: "Forçar Iniciante — Idade 55+",
    conditions: [{ field: "idade", operator: ">=", value: "55" }],
    result: "Iniciante",
    override: true,
    active: true,
    description: "Maiores de 55 anos são alocados no protocolo iniciante por segurança.",
  },
  {
    id: "forcar-iniciante-dor",
    priority: 10,
    name: "Forçar Iniciante — Dor ou Lesão",
    conditions: [{ field: "dor_saude", operator: "igual a", value: "Sim" }],
    result: "Iniciante",
    override: true,
    active: true,
    description: "Qualquer usuário com dor/lesão é forçado para nível iniciante independente de outras regras.",
  },
  {
    id: "intermediario-experiencia",
    priority: 20,
    name: "Intermediário por Experiência",
    conditions: [{ field: "experiencia", operator: "igual a", value: "intermediario" }],
    result: "Intermediário",
    override: false,
    active: true,
  },
]

function emptyRuleForm(nextPriority: number): {
  name: string
  priority: string
  conditions: RuleCondition[]
  result: string
  program: string
  override: boolean
  description: string
} {
  return {
    name: "",
    priority: String(nextPriority),
    conditions: [{ field: FIELD_OPTIONS[0], operator: OPERATOR_OPTIONS[0].value, value: "" }],
    result: LEVEL_OPTIONS[0],
    program: "",
    override: false,
    description: "",
  }
}

function ruleToForm(rule: OverrideRule): ReturnType<typeof emptyRuleForm> {
  return {
    name: rule.name,
    priority: String(rule.priority),
    conditions: rule.conditions.map((condition) => ({ ...condition })),
    result: rule.result,
    program: rule.program ?? "",
    override: rule.override,
    description: rule.description ?? "",
  }
}

const FIELD_ROWS = [
  {
    CAMPO: "experiencia",
    "PERGUNTA NO QUIZ": "Q6 – Experiência com academia",
    "VALORES ACEITOS": "iniciante · intermediario · avancado",
  },
  {
    CAMPO: "idade",
    "PERGUNTA NO QUIZ": "Q2 – Idade (número)",
    "VALORES ACEITOS": "ex: 18, 25, 55 — use operadores >= ou <=",
  },
  {
    CAMPO: "dor_saude",
    "PERGUNTA NO QUIZ": "Q21 – Tem dor ou problema físico?",
    "VALORES ACEITOS": "Sim · Não",
  },
  {
    CAMPO: "treinando",
    "PERGUNTA NO QUIZ": "Q7 – Está treinando atualmente?",
    "VALORES ACEITOS": "Sim · Não",
  },
  {
    CAMPO: "objetivo",
    "PERGUNTA NO QUIZ": "Q10 – Objetivo principal",
    "VALORES ACEITOS": "Crescer · Secar Muito · Crescer e Secar",
  },
  {
    CAMPO: "urgencia",
    "PERGUNTA NO QUIZ": "Q14 – Urgência",
    "VALORES ACEITOS": "Muito alta · Alta · Média · Normal",
  },
  {
    CAMPO: "gasto_mensal",
    "PERGUNTA NO QUIZ": "Q15 – Gasto mensal",
    "VALORES ACEITOS": "Até R$ 500 · R$ 500 – R$ 1.000 · Acima de R$ 3.000",
  },
  { CAMPO: "genero", "PERGUNTA NO QUIZ": "Q1 – Gênero", "VALORES ACEITOS": "Homem · Mulher" },
]

const TESTER_FIELDS: { key: string; label: string }[] = [
  { key: "genero", label: "Gênero (q1)" },
  { key: "idade", label: "Idade (q2)" },
  { key: "experiencia", label: "Experiência (q6)" },
  { key: "treinando", label: "Treinando? (q7)" },
  { key: "objetivo", label: "Objetivo (q10)" },
  { key: "urgencia", label: "Urgência (q14)" },
  { key: "gasto_mensal", label: "Gasto mensal (q15)" },
  { key: "dor_saude", label: "Dor/Saúde (q21)" },
]

const QUICK_PROFILES: QuickProfile[] = [
  {
    label: "Iniciante, 25 anos",
    values: {
      genero: "Homem",
      idade: "25",
      experiencia: "iniciante",
      treinando: "Sim",
      objetivo: "Crescer",
      urgencia: "Alta",
      gasto_mensal: "R$ 500 – R$ 1.000",
      dor_saude: "Não",
    },
  },
  {
    label: "Intermediário, 30 anos",
    values: {
      genero: "Mulher",
      idade: "30",
      experiencia: "intermediario",
      treinando: "Sim",
      objetivo: "Crescer e Secar",
      urgencia: "Média",
      gasto_mensal: "R$ 500 – R$ 1.000",
      dor_saude: "Não",
    },
  },
  {
    label: "Avançado, 35 anos",
    values: {
      genero: "Homem",
      idade: "35",
      experiencia: "avancado",
      treinando: "Sim",
      objetivo: "Secar Muito",
      urgencia: "Normal",
      gasto_mensal: "Acima de R$ 3.000",
      dor_saude: "Não",
    },
  },
  {
    label: "Sênior 60 anos (deve forçar iniciante)",
    values: {
      genero: "Mulher",
      idade: "60",
      experiencia: "avancado",
      treinando: "Sim",
      objetivo: "Crescer",
      urgencia: "Alta",
      gasto_mensal: "R$ 500 – R$ 1.000",
      dor_saude: "Não",
    },
  },
  {
    label: "Com dor/lesão (deve forçar iniciante)",
    values: {
      genero: "Homem",
      idade: "30",
      experiencia: "avancado",
      treinando: "Sim",
      objetivo: "Crescer",
      urgencia: "Alta",
      gasto_mensal: "Acima de R$ 3.000",
      dor_saude: "Sim",
    },
  },
]

function singleConditionLabel(condition: RuleCondition) {
  return `${condition.field} ${condition.operator} "${condition.value}"`
}

function conditionLabel(rule: OverrideRule) {
  return rule.conditions.map(singleConditionLabel).join(" E ")
}

function conditionMatches(condition: RuleCondition, profile: Record<string, string>): boolean {
  const fieldValue = profile[condition.field]
  if (!fieldValue) return false
  if (condition.operator === ">=") return Number(fieldValue) >= Number(condition.value)
  if (condition.operator === "<=") return Number(fieldValue) <= Number(condition.value)
  return fieldValue.trim().toLowerCase() === condition.value.trim().toLowerCase()
}

function ruleMatches(rule: OverrideRule, profile: Record<string, string>): boolean {
  return rule.conditions.every((condition) => conditionMatches(condition, profile))
}

interface RegrasPageProps {
  canEdit?: boolean
}

export function RegrasPage({ canEdit: canEditProp }: RegrasPageProps) {
  const [searchParams] = useSearchParams()
  const canEdit = canEditProp ?? searchParams.get("canEdit") !== "false"
  const forceEmpty = searchParams.get("empty") === "1"
  const forceLoading = searchParams.get("loading") === "1"

  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<OverrideRule[]>(MOCK_RULES)
  const [deletingRule, setDeletingRule] = useState<OverrideRule | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState(emptyRuleForm(10))
  const [testProfile, setTestProfile] = useState<Record<string, string>>({})
  const [tested, setTested] = useState(false)

  useEffect(() => {
    if (forceLoading) return
    const timeout = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timeout)
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const list = forceEmpty ? [] : rules
  const sortedRules = useMemo(() => [...list].sort((a, b) => a.priority - b.priority), [list])
  const activeCount = sortedRules.filter((rule) => rule.active).length

  const matchedRule = useMemo(
    () => sortedRules.find((rule) => ruleMatches(rule, testProfile)) ?? null,
    [sortedRules, testProfile]
  )

  function moveRule(id: string, direction: "up" | "down") {
    setRules((current) => {
      const sorted = [...current].sort((a, b) => a.priority - b.priority)
      const index = sorted.findIndex((rule) => rule.id === id)
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return current
      const a = sorted[index]
      const b = sorted[targetIndex]
      return current.map((rule) => {
        if (rule.id === a.id) return { ...rule, priority: b.priority }
        if (rule.id === b.id) return { ...rule, priority: a.priority }
        return rule
      })
    })
  }

  function toggleActive(id: string) {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, active: !rule.active } : rule))
    )
  }

  function handleConfirmDelete() {
    if (!deletingRule) return
    setRules((current) => current.filter((rule) => rule.id !== deletingRule.id))
    setDeletingRule(null)
  }

  function openNewRuleModal() {
    const nextPriority = sortedRules.length > 0 ? sortedRules[sortedRules.length - 1].priority + 10 : 10
    setEditingId(null)
    setRuleForm(emptyRuleForm(nextPriority))
    setRuleModalOpen(true)
  }

  function openEditRuleModal(rule: OverrideRule) {
    setEditingId(rule.id)
    setRuleForm(ruleToForm(rule))
    setRuleModalOpen(true)
  }

  function closeRuleModal() {
    setRuleModalOpen(false)
    setEditingId(null)
  }

  function updateConditionField(index: number, patch: Partial<RuleCondition>) {
    setRuleForm((current) => ({
      ...current,
      conditions: current.conditions.map((condition, conditionIndex) =>
        conditionIndex === index ? { ...condition, ...patch } : condition
      ),
    }))
  }

  function addConditionRow() {
    setRuleForm((current) => ({
      ...current,
      conditions: [
        ...current.conditions,
        { field: FIELD_OPTIONS[0], operator: OPERATOR_OPTIONS[0].value, value: "" },
      ],
    }))
  }

  function removeConditionRow(index: number) {
    setRuleForm((current) => ({
      ...current,
      conditions: current.conditions.filter((_, conditionIndex) => conditionIndex !== index),
    }))
  }

  function handleSubmitRule(event: React.FormEvent) {
    event.preventDefault()
    const priority = Number(ruleForm.priority)
    const nextRule: OverrideRule = {
      id: editingId ?? `mock-${Date.now()}`,
      priority: Number.isFinite(priority) ? priority : 0,
      name: ruleForm.name || "Nova regra",
      conditions: ruleForm.conditions,
      result: ruleForm.result,
      program: ruleForm.program || undefined,
      override: ruleForm.override,
      active: editingId ? (rules.find((rule) => rule.id === editingId)?.active ?? true) : true,
      description: ruleForm.description || undefined,
    }

    if (editingId) {
      setRules((current) => current.map((rule) => (rule.id === editingId ? nextRule : rule)))
    } else {
      setRules((current) => [...current, nextRule])
    }

    closeRuleModal()
  }

  function applyQuickProfile(profile: QuickProfile) {
    setTestProfile(profile.values)
    setTested(false)
  }

  function updateTestField(key: string, value: string) {
    setTestProfile((current) => ({ ...current, [key]: value }))
    setTested(false)
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <EntityListHeader
          title="Regras"
          className="items-start"
          actions={canEdit ? [{ label: "Nova Regra", icon: Plus, onClick: openNewRuleModal }] : []}
        />
        <p className="-mt-4 text-sm text-muted-foreground">
          {sortedRules.length} regra{sortedRules.length === 1 ? "" : "s"} cadastrada
          {sortedRules.length === 1 ? "" : "s"} · {activeCount} ativa{activeCount === 1 ? "" : "s"}
        </p>

        <Card>
          <CardContent className="space-y-3">
            <CardTitle className="text-base">Como funciona o sistema de regras</CardTitle>
            <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>
                <span className="font-semibold text-primary">1. </span>
                O sistema avalia todas as regras ativas em ordem de{" "}
                <span className="font-semibold text-foreground">prioridade</span> (número menor = avaliada
                primeiro).
              </p>
              <p>
                <span className="font-semibold text-primary">2. </span>A{" "}
                <span className="font-semibold text-foreground">primeira regra que bater</span> com o
                perfil do usuário define o nível dele (Iniciante, Intermediário ou Avançado).
              </p>
              <p>
                <span className="font-semibold text-destructive">3. </span>
                Regras marcadas como <span className="font-semibold text-destructive">Override</span>{" "}
                forçam o resultado e ignoram todas as outras — mesmo que outra regra também bata.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="regras">
          <TabsList className="sticky top-0 z-10">
            <TabsTrigger value="regras" className="gap-1.5">
              <ListChecks className="size-4" />
              Regras
              <Badge variant="secondary">{sortedRules.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="testador" className="gap-1.5">
              <FlaskConical className="size-4" />
              Testador
            </TabsTrigger>
            <TabsTrigger value="campos" className="gap-1.5">
              <BookOpen className="size-4" />
              Campos disponíveis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regras" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-start gap-3 p-0">
                      <Skeleton className="size-9 shrink-0 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedRules.length === 0 ? (
              <EmptyState icon={ListChecks} message="Nenhuma regra cadastrada ainda." />
            ) : (
              sortedRules.map((rule, index) => (
                <div key={rule.id} className="flex items-start gap-2">
                  {canEdit && (
                    <div className="flex flex-col gap-1 pt-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveRule(rule.id, "up")}
                        aria-label={`Subir prioridade de "${rule.name}"`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === sortedRules.length - 1}
                        onClick={() => moveRule(rule.id, "down")}
                        aria-label={`Descer prioridade de "${rule.name}"`}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <OverrideRuleCard
                      priority={rule.priority}
                      condition={`${rule.name} — ${conditionLabel(rule)}`}
                      result={rule.result}
                      override={rule.override}
                      active={rule.active}
                      onToggleActive={canEdit ? () => toggleActive(rule.id) : undefined}
                      onEdit={canEdit ? () => openEditRuleModal(rule) : undefined}
                      onDelete={canEdit ? () => setDeletingRule(rule) : undefined}
                    />
                    {rule.description && (
                      <p className="px-4 text-xs italic text-muted-foreground">{rule.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="testador" className="space-y-6">
            <Card>
              <CardHeader className="space-y-1 p-4 pb-2">
                <CardTitle className="text-base">Testar Regras</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Simule o perfil de um usuário e veja qual regra seria aplicada. Use os perfis
                  prontos ou preencha manualmente.
                </p>
              </CardHeader>
              <CardContent className="space-y-6 p-4 pt-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Perfis de teste rápido
                  </h4>
                  <QuickProfileButtonGrid profiles={QUICK_PROFILES} onSelect={applyQuickProfile} />
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ou preencha manualmente
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {TESTER_FIELDS.map((field) => (
                      <label key={field.key} className="block space-y-1.5">
                        <span className="text-sm font-medium">{field.label}</span>
                        <Input
                          value={testProfile[field.key] ?? ""}
                          onChange={(event) => updateTestField(field.key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <Button type="button" className="w-full" onClick={() => setTested(true)}>
                  Testar Classificação
                </Button>
              </CardContent>
            </Card>

            {tested && (
              <Card className={matchedRule?.override ? "border-l-4 border-l-destructive" : undefined}>
                <CardContent className="space-y-1">
                  {matchedRule ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">Resultado: {matchedRule.result}</CardTitle>
                        {matchedRule.override && <Badge variant="destructive">⚠ OVERRIDE</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Regra aplicada: "{matchedRule.name}" (prioridade {matchedRule.priority}) —{" "}
                        {conditionLabel(matchedRule)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma regra cadastrada corresponde a este perfil.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="campos" className="space-y-3">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Campos disponíveis nas regras</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use esses nomes exatos no campo "Campo" ao criar uma regra. Cada campo
                  corresponde a uma pergunta do quiz.
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <FieldReferenceTable
                    columns={["CAMPO", "PERGUNTA NO QUIZ", "VALORES ACEITOS"]}
                    rows={FIELD_ROWS}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {canEdit && ruleModalOpen && (
        <EntityEditModalShell
          title={editingId ? "Editar Regra" : "Nova Regra"}
          onClose={closeRuleModal}
          className="max-w-2xl"
          footer={
            <>
              <Button type="button" variant="outline" onClick={closeRuleModal}>
                Cancelar
              </Button>
              <Button type="submit" form="rule-edit-form">
                Salvar Regra
              </Button>
            </>
          }
        >
          <form id="rule-edit-form" className="space-y-4" onSubmit={handleSubmitRule}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Nome da regra *</span>
                <Input
                  required
                  placeholder="Ex: Iniciante por experiência"
                  value={ruleForm.name}
                  onChange={(event) =>
                    setRuleForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Prioridade (menor = mais importante)</span>
                <Input
                  type="number"
                  value={ruleForm.priority}
                  onChange={(event) =>
                    setRuleForm((current) => ({ ...current, priority: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Se (condição)
              </h4>
              {ruleForm.conditions.map((condition, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Campo</span>
                    <Select
                      value={condition.field}
                      onValueChange={(value) => updateConditionField(index, { field: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Operador</span>
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateConditionField(index, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATOR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Valor</span>
                    <Input
                      placeholder="Ex: iniciante, 55, sim"
                      value={condition.value}
                      onChange={(event) => updateConditionField(index, { value: event.target.value })}
                    />
                  </label>
                  {ruleForm.conditions.length > 1 && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="self-end"
                      onClick={() => removeConditionRow(index)}
                      aria-label="Remover condição"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={addConditionRow}>
                + Adicionar condição AND
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Então (resultado)
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Nível atribuído *</span>
                  <Select
                    value={ruleForm.result}
                    onValueChange={(value) => setRuleForm((current) => ({ ...current, result: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Protocolo/Programa (opcional)</span>
                  <Input
                    placeholder="Nome ou ID do programa"
                    value={ruleForm.program}
                    onChange={(event) =>
                      setRuleForm((current) => ({ ...current, program: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ruleForm.override}
                  onChange={(event) =>
                    setRuleForm((current) => ({ ...current, override: event.target.checked }))
                  }
                />
                Forçar resultado (override) — sobrepõe outras regras
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Descrição / Observação (opcional)</span>
              <Textarea
                placeholder="Ex: Força iniciante para maiores de 55 anos"
                value={ruleForm.description}
                onChange={(event) =>
                  setRuleForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
          </form>
        </EntityEditModalShell>
      )}

      {deletingRule && (
        <EntityEditModalShell
          title="Excluir regra"
          description={`Tem certeza que deseja excluir "${deletingRule.name}"? Essa ação não pode ser desfeita.`}
          onClose={() => setDeletingRule(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeletingRule(null)}>
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
