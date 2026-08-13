import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowDown, ArrowUp, BookOpen, FlaskConical, ListChecks, Plus, Trash2 } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { Textarea } from "@/components/atoms/textarea"
import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { FieldReferenceTable } from "@/components/composites/field-reference-table"
import { OverrideRuleCard } from "@/components/composites/override-rule-card"
import { QuickProfileButtonGrid, type QuickProfile } from "@/components/composites/quick-profile-button-grid"
import { adminMutation, adminRpc, adminSelect } from "@/lib/admin-crm-api"

type NivelResultado = "iniciante" | "avancado"
type RuleOperator = "eq" | "gte" | "lte"

interface RuleCondition {
  field: string
  operator: RuleOperator
  value: string
}

interface ApiRuleCondition {
  campo: string
  operador: RuleOperator
  valor: string
}

interface OverrideRule {
  id: string
  priority: number
  name: string
  conditions: RuleCondition[]
  result: NivelResultado
  override: boolean
  active: boolean
  description?: string
}

interface AdminRuleRow {
  rule_id: string
  nome: string
  descricao: string | null
  prioridade: number
  condicoes: ApiRuleCondition[]
  nivel_resultado: NivelResultado
  override: boolean
  ativo: boolean
}

interface AdminRuleResponse {
  ruleId: string
  nome: string
  descricao: string | null
  prioridade: number
  condicoes: ApiRuleCondition[]
  nivelResultado: NivelResultado
  override: boolean
  ativo: boolean
}

interface QuizFieldRow {
  campo: string
  label: string
  tipo: string
  valores_permitidos: string[] | null
}

interface TestResponse {
  nivel: NivelResultado
  fieldValues: Record<string, string>
}

const OPERATOR_OPTIONS: { value: RuleOperator; label: string }[] = [
  { value: "eq", label: "= igual a" },
  { value: "gte", label: ">= maior ou igual" },
  { value: "lte", label: "<= menor ou igual" },
]

const LEVEL_OPTIONS: { value: NivelResultado; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "avancado", label: "Avançado" },
]

const QUICK_PROFILES: QuickProfile[] = [
  {
    label: "Iniciante, 25 anos",
    values: {
      genero: "Homem",
      idade: "25",
      experiencia: "Iniciante",
      treinando: "Sim",
      objetivo: "Crescer",
      urgencia: "Alta",
      gasto_mensal: "R$ 500 – R$ 1.000",
      dor_saude: "Não",
    },
  },
  {
    label: "Experiente, 35 anos",
    values: {
      genero: "Homem",
      idade: "35",
      experiencia: "Experiente",
      treinando: "Sim",
      objetivo: "Secar Muito",
      urgencia: "Normal",
      gasto_mensal: "Acima de R$ 3.000",
      dor_saude: "Não",
    },
  },
  {
    label: "Sênior 60 anos",
    values: {
      genero: "Mulher",
      idade: "60",
      experiencia: "Experiente",
      treinando: "Sim",
      objetivo: "Crescer",
      urgencia: "Alta",
      gasto_mensal: "R$ 500 – R$ 1.000",
      dor_saude: "Não",
    },
  },
  {
    label: "Com dor/lesão",
    values: {
      genero: "Homem",
      idade: "30",
      experiencia: "Experiente",
      treinando: "Sim",
      objetivo: "Crescer",
      urgencia: "Alta",
      gasto_mensal: "Acima de R$ 3.000",
      dor_saude: "Sim",
    },
  },
]

function nivelLabel(value: string) {
  return LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function operatorLabel(value: RuleOperator) {
  return OPERATOR_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function rowToRule(row: AdminRuleRow): OverrideRule {
  return {
    id: row.rule_id,
    priority: row.prioridade,
    name: row.nome,
    conditions: row.condicoes.map((condition) => ({
      field: condition.campo,
      operator: condition.operador,
      value: condition.valor,
    })),
    result: row.nivel_resultado,
    override: row.override,
    active: row.ativo,
    description: row.descricao ?? undefined,
  }
}

function responseToRule(row: AdminRuleResponse): OverrideRule {
  return {
    id: row.ruleId,
    priority: row.prioridade,
    name: row.nome,
    conditions: row.condicoes.map((condition) => ({
      field: condition.campo,
      operator: condition.operador,
      value: condition.valor,
    })),
    result: row.nivelResultado,
    override: row.override,
    active: row.ativo,
    description: row.descricao ?? undefined,
  }
}

function conditionsToPayload(conditions: RuleCondition[]): ApiRuleCondition[] {
  return conditions.map((condition) => ({
    campo: condition.field,
    operador: condition.operator,
    valor: condition.value,
  }))
}

function emptyRuleForm(nextPriority: number, firstField: string): {
  name: string
  priority: string
  conditions: RuleCondition[]
  result: NivelResultado
  override: boolean
  description: string
} {
  return {
    name: "",
    priority: String(nextPriority),
    conditions: [{ field: firstField, operator: OPERATOR_OPTIONS[0].value, value: "" }],
    result: LEVEL_OPTIONS[0].value,
    override: false,
    description: "",
  }
}

function ruleToForm(rule: OverrideRule, firstField: string): ReturnType<typeof emptyRuleForm> {
  return {
    name: rule.name,
    priority: String(rule.priority),
    conditions: rule.conditions.length > 0 ? rule.conditions.map((condition) => ({ ...condition })) : [
      { field: firstField, operator: OPERATOR_OPTIONS[0].value, value: "" },
    ],
    result: rule.result,
    override: rule.override,
    description: rule.description ?? "",
  }
}

function singleConditionLabel(condition: RuleCondition) {
  return `${condition.field} ${operatorLabel(condition.operator)} "${condition.value}"`
}

function conditionLabel(rule: OverrideRule) {
  return rule.conditions.map(singleConditionLabel).join(" E ")
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nao foi possivel concluir a operacao."
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
  const [error, setError] = useState<string | null>(null)
  const [rules, setRules] = useState<OverrideRule[]>([])
  const [fields, setFields] = useState<QuizFieldRow[]>([])
  const [deletingRule, setDeletingRule] = useState<OverrideRule | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const firstField = fields[0]?.campo ?? "genero"
  const [ruleForm, setRuleForm] = useState(emptyRuleForm(10, firstField))
  const [testProfile, setTestProfile] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<TestResponse | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [ruleRows, fieldRows] = await Promise.all([
        adminRpc<AdminRuleRow[]>("admin_classification_rules_list"),
        adminSelect<QuizFieldRow[]>("admin_quiz_fields", "campo,label,tipo,valores_permitidos"),
      ])
      setRules(ruleRows.map(rowToRule))
      setFields(fieldRows)
    } catch (loadError) {
      setError(errorMessage(loadError))
      setRules([])
      setFields([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (forceLoading) return
    void loadData()
  }, [forceLoading])

  const isLoading = forceLoading || loading
  const list = forceEmpty ? [] : rules
  const sortedRules = useMemo(() => [...list].sort((a, b) => a.priority - b.priority), [list])
  const activeCount = sortedRules.filter((rule) => rule.active).length
  const testerFields = fields.length > 0 ? fields : []
  const fieldRows = fields.map((field) => ({
    CAMPO: field.campo,
    "PERGUNTA NO QUIZ": field.label,
    "VALORES ACEITOS": field.valores_permitidos?.join(" · ") ?? field.tipo,
  }))

  async function patchRule(rule: OverrideRule, payload: Partial<{
    nome: string
    descricao: string | null
    prioridade: number
    condicoes: ApiRuleCondition[]
    nivelResultado: NivelResultado
    override: boolean
    ativo: boolean
  }>) {
    const updated = await adminMutation<AdminRuleResponse>(`/admin/classification-rules/${rule.id}`, {
      method: "PATCH",
      body: payload,
    })
    setRules((current) => current.map((item) => (item.id === rule.id ? responseToRule(updated) : item)))
  }

  async function moveRule(id: string, direction: "up" | "down") {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority)
    const index = sorted.findIndex((rule) => rule.id === id)
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return
    const a = sorted[index]
    const b = sorted[targetIndex]
    setError(null)
    try {
      await Promise.all([
        patchRule(a, { prioridade: b.priority }),
        patchRule(b, { prioridade: a.priority }),
      ])
    } catch (moveError) {
      setError(errorMessage(moveError))
    }
  }

  async function toggleActive(rule: OverrideRule) {
    setError(null)
    try {
      await patchRule(rule, { ativo: !rule.active })
    } catch (toggleError) {
      setError(errorMessage(toggleError))
    }
  }

  async function handleConfirmDelete() {
    if (!deletingRule || deleteLoading) return
    setDeleteLoading(true)
    setError(null)
    try {
      await adminMutation<{ ruleId: string; deleted: boolean }>(`/admin/classification-rules/${deletingRule.id}`, {
        method: "DELETE",
      })
      setRules((current) => current.filter((rule) => rule.id !== deletingRule.id))
      setDeletingRule(null)
    } catch (deleteError) {
      setError(errorMessage(deleteError))
    } finally {
      setDeleteLoading(false)
    }
  }

  function openNewRuleModal() {
    const nextPriority = sortedRules.length > 0 ? sortedRules[sortedRules.length - 1].priority + 10 : 10
    setEditingId(null)
    setRuleForm(emptyRuleForm(nextPriority, firstField))
    setRuleModalOpen(true)
  }

  function openEditRuleModal(rule: OverrideRule) {
    setEditingId(rule.id)
    setRuleForm(ruleToForm(rule, firstField))
    setRuleModalOpen(true)
  }

  function closeRuleModal() {
    setRuleModalOpen(false)
    setEditingId(null)
    setSaving(false)
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
        { field: firstField, operator: OPERATOR_OPTIONS[0].value, value: "" },
      ],
    }))
  }

  function removeConditionRow(index: number) {
    setRuleForm((current) => ({
      ...current,
      conditions: current.conditions.filter((_, conditionIndex) => conditionIndex !== index),
    }))
  }

  async function handleSubmitRule(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)

    const priority = Number(ruleForm.priority)
    const payload = {
      nome: ruleForm.name,
      descricao: ruleForm.description || null,
      prioridade: Number.isFinite(priority) ? priority : 1,
      condicoes: conditionsToPayload(ruleForm.conditions),
      nivelResultado: ruleForm.result,
      override: ruleForm.override,
      ativo: editingId ? (rules.find((rule) => rule.id === editingId)?.active ?? true) : true,
    }

    try {
      const saved = editingId
        ? await adminMutation<AdminRuleResponse>(`/admin/classification-rules/${editingId}`, {
            method: "PATCH",
            body: payload,
          })
        : await adminMutation<AdminRuleResponse>("/admin/classification-rules", {
            method: "POST",
            body: payload,
          })
      const nextRule = responseToRule(saved)
      setRules((current) =>
        editingId
          ? current.map((rule) => (rule.id === editingId ? nextRule : rule))
          : [...current, nextRule]
      )
      closeRuleModal()
    } catch (submitError) {
      setError(errorMessage(submitError))
      setSaving(false)
    }
  }

  function applyQuickProfile(profile: QuickProfile) {
    setTestProfile(profile.values)
    setTestResult(null)
    setTestError(null)
  }

  function updateTestField(key: string, value: string) {
    setTestProfile((current) => ({ ...current, [key]: value }))
    setTestResult(null)
    setTestError(null)
  }

  async function testClassification() {
    setTesting(true)
    setTestResult(null)
    setTestError(null)
    try {
      const respostas = Object.entries(testProfile)
        .filter(([, resposta]) => resposta.trim() !== "")
        .map(([pergunta, resposta]) => ({ pergunta, resposta }))
      const result = await adminMutation<TestResponse>("/admin/classification-rules/test", {
        method: "POST",
        body: { respostas },
      })
      setTestResult(result)
    } catch (testRequestError) {
      setTestError(errorMessage(testRequestError))
    } finally {
      setTesting(false)
    }
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

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Card>
          <CardContent className="space-y-3">
            <CardTitle className="text-base">Como funciona o sistema de regras</CardTitle>
            <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>
                <span className="font-semibold text-primary">1. </span>
                O sistema avalia regras ativas em ordem de{" "}
                <span className="font-semibold text-foreground">prioridade</span>.
              </p>
              <p>
                <span className="font-semibold text-primary">2. </span>
                O resultado exibido pelo testador vem do endpoint real do backend.
              </p>
              <p>
                <span className="font-semibold text-destructive">3. </span>
                Regras marcadas como <span className="font-semibold text-destructive">Override</span>{" "}
                continuam com precedência na geração real.
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
                        onClick={() => void moveRule(rule.id, "up")}
                        aria-label={`Subir prioridade de "${rule.name}"`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === sortedRules.length - 1}
                        onClick={() => void moveRule(rule.id, "down")}
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
                      result={nivelLabel(rule.result)}
                      override={rule.override}
                      active={rule.active}
                      onToggleActive={canEdit ? () => void toggleActive(rule) : undefined}
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
                  Simule o perfil de um usuário e veja o resultado retornado pelo backend.
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
                    {testerFields.map((field) => (
                      <label key={field.campo} className="block space-y-1.5">
                        <span className="text-sm font-medium">{field.label}</span>
                        <Input
                          value={testProfile[field.campo] ?? ""}
                          onChange={(event) => updateTestField(field.campo, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <Button type="button" className="w-full" disabled={testing} onClick={() => void testClassification()}>
                  {testing ? "Testando..." : "Testar Classificação"}
                </Button>
              </CardContent>
            </Card>

            {(testResult || testError) && (
              <Card>
                <CardContent className="space-y-1">
                  {testResult ? (
                    <>
                      <CardTitle className="text-base">Resultado: {nivelLabel(testResult.nivel)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Classificação calculada por `/admin/classification-rules/test`.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-destructive">{testError}</p>
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
                  Os campos abaixo vêm de `admin_quiz_fields`.
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
                    rows={fieldRows}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {ruleModalOpen && (
        <EntityEditModalShell
          title={editingId ? "Editar regra" : "Nova regra"}
          onClose={closeRuleModal}
          footer={
            <Button type="submit" form="rule-edit-form" disabled={saving}>
              {saving ? "Salvando..." : "Salvar regra"}
            </Button>
          }
        >
          <form id="rule-edit-form" className="space-y-4" onSubmit={handleSubmitRule}>
            <Input
              placeholder="Nome da regra"
              value={ruleForm.name}
              onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                placeholder="Prioridade"
                type="number"
                value={ruleForm.priority}
                onChange={(event) =>
                  setRuleForm((current) => ({ ...current, priority: event.target.value }))
                }
              />
              <Select
                value={ruleForm.result}
                onValueChange={(value) =>
                  setRuleForm((current) => ({ ...current, result: value as NivelResultado }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Resultado" />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={ruleForm.override ? "true" : "false"}
                onValueChange={(value) =>
                  setRuleForm((current) => ({ ...current, override: value === "true" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Regra padrão</SelectItem>
                  <SelectItem value="true">Override</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold">Condições</h4>
                <Button type="button" variant="outline" size="sm" onClick={addConditionRow}>
                  Adicionar condição
                </Button>
              </div>
              {ruleForm.conditions.map((condition, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <Select
                    value={condition.field}
                    onValueChange={(value) => updateConditionField(index, { field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field.campo} value={field.campo}>
                          {field.campo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) => updateConditionField(index, { operator: value as RuleOperator })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Operador" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Valor"
                    value={condition.value}
                    onChange={(event) => updateConditionField(index, { value: event.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={ruleForm.conditions.length === 1}
                    onClick={() => removeConditionRow(index)}
                    aria-label="Remover condição"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>

            <Textarea
              placeholder="Descrição"
              value={ruleForm.description}
              onChange={(event) =>
                setRuleForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </form>
        </EntityEditModalShell>
      )}

      {deletingRule && (
        <EntityEditModalShell
          title="Excluir regra"
          description={`Tem certeza que deseja excluir "${deletingRule.name}"? A regra será inativada no backend.`}
          onClose={() => setDeletingRule(null)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setDeletingRule(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? "Excluindo..." : "Excluir regra"}
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
