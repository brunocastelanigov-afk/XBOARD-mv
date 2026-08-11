import { useState } from "react"
import {
  Bell,
  Dumbbell,
  Edit,
  FileStack,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/atoms/card"
import { Progress } from "@/components/atoms/progress"
import { Badge } from "@/components/atoms/badge"
import { Input } from "@/components/atoms/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/atoms/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs"

import { DashboardFiltersProvider } from "@/contexts/dashboard-filters-context"

import { FilterBar } from "@/components/composites/filter-bar"
import { DataGrid } from "@/components/composites/data-grid"
import { MetricCard } from "@/components/composites/metric-card"
import { ChartCard } from "@/components/composites/chart-card"

import { ProgressListItem } from "@/components/atoms/progress-list-item"
import { SearchInput } from "@/components/atoms/search-input"
import { DropzoneButton } from "@/components/atoms/dropzone-button"
import { ToggleButtonGroup } from "@/components/atoms/toggle-button-group"
import { StepperInput } from "@/components/atoms/stepper-input"
import { ColorPickerField } from "@/components/atoms/color-picker-field"
import { StatusIcon, type StatusIconStatus } from "@/components/atoms/status-icon"
import { PlanBadge } from "@/components/atoms/plan-badge"
import { EmptyState } from "@/components/atoms/empty-state"

import { StatTile } from "@/components/composites/stat-tile"
import { DonutChartCard } from "@/components/composites/donut-chart-card"
import { BarChartCard } from "@/components/composites/bar-chart-card"
import { EntityCard } from "@/components/composites/entity-card"
import { EntityListHeader } from "@/components/composites/entity-list-header"
import { CategoryPillFilter } from "@/components/composites/category-pill-filter"
import { VideoLinkField } from "@/components/composites/video-link-field"
import { TwoColumnFormLayout } from "@/components/composites/two-column-form-layout"
import { ApplyValueCard } from "@/components/composites/apply-value-card"

import { EntityEditModalShell } from "@/components/composites/entity-edit-modal-shell"
import { WizardTabs } from "@/components/composites/wizard-tabs"
import { ReorderableListItem } from "@/components/composites/reorderable-list-item"
import { LinkedEntitySearchList } from "@/components/composites/linked-entity-search-list"
import { OverrideRuleCard } from "@/components/composites/override-rule-card"
import { FieldReferenceTable } from "@/components/composites/field-reference-table"
import { QuickProfileButtonGrid } from "@/components/composites/quick-profile-button-grid"
import { PeriodFilterBar, type PeriodFilterRange } from "@/components/composites/period-filter-bar"
import { DrilldownQuestionCard } from "@/components/composites/drilldown-question-card"

function AdminCrmAuditSection() {
  const [searchValue, setSearchValue] = useState("")
  const [toggleValue1, setToggleValue1] = useState("aluno")
  const [toggleValue2, setToggleValue2] = useState("elite")
  const [stepperValue, setStepperValue] = useState(3)
  const [colorValue, setColorValue] = useState("#4f8ef7")

  const statuses: StatusIconStatus[] = ["pending", "done", "locked", "warning"]

  const [categoryActive, setCategoryActive] = useState("Peito")
  const [videoUrl, setVideoUrl] = useState<string | undefined>(
    "https://videos.exemplo.com/exercicio-supino.mp4"
  )
  const [evaluationDeadline, setEvaluationDeadline] = useState("14")

  const [editModalOpen, setEditModalOpen] = useState(true)
  const [ruleActive1, setRuleActive1] = useState(true)
  const [ruleActive2, setRuleActive2] = useState(true)
  const [linkedQuery, setLinkedQuery] = useState("")
  const [periodRange1, setPeriodRange1] = useState<PeriodFilterRange>("all")
  const [periodEmail1, setPeriodEmail1] = useState("")
  const [periodRange2, setPeriodRange2] = useState<PeriodFilterRange>("7d")
  const [periodEmail2, setPeriodEmail2] = useState("")

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold border-b border-border pb-2">
          Atoms novos (Goal 1/3)
        </h2>
        <p className="text-muted-foreground mt-2">
          9 componentes atômicos novos do Passo 00 (Parte 2), expansão CRM do admin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">1. Progress List Item</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <ProgressListItem label="Elite" value="2.468" percent={5} color="accent" />
              <ProgressListItem label="Trinca" value="48.710" percent={95} color="success" />
              <ProgressListItem label="Reembolsos" value="187" percent={3} color="destructive" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">2. Search Input</h3>
          <Card>
            <CardContent className="p-4">
              <SearchInput
                placeholder="Buscar por nome, e-mail..."
                value={searchValue}
                onChange={setSearchValue}
                onSearch={(value) => console.log("search:", value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">3. Dropzone Button</h3>
          <Card>
            <CardContent className="p-4">
              <DropzoneButton
                label="Trocar arquivo de vídeo"
                accept="video/*"
                onFileSelect={(file) => console.log("file:", file.name)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">
            4. Toggle Button Group (columns=1 e columns=2)
          </h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <ToggleButtonGroup
                options={[
                  { label: "Aluno", value: "aluno" },
                  { label: "Suporte", value: "suporte" },
                  { label: "Treinador", value: "treinador", icon: Dumbbell },
                  { label: "Administrador", value: "administrador", icon: ShieldAlert },
                ]}
                value={toggleValue1}
                onChange={setToggleValue1}
                columns={2}
              />
              <ToggleButtonGroup
                options={[
                  { label: "⚡ Liberar Trinca", value: "trinca" },
                  { label: "👑 Elite", value: "elite" },
                ]}
                value={toggleValue2}
                onChange={setToggleValue2}
                columns={1}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">5. Stepper Input</h3>
          <Card>
            <CardContent className="p-4">
              <StepperInput
                value={stepperValue}
                min={1}
                max={7}
                onChange={setStepperValue}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">6. Color Picker Field</h3>
          <Card>
            <CardContent className="p-4">
              <ColorPickerField
                label="Cor do texto"
                value={colorValue}
                onChange={setColorValue}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">7. Status Icon (todas as variantes)</h3>
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-6">
              {statuses.map((status) => (
                <div key={status} className="flex flex-col items-center gap-1.5">
                  <StatusIcon status={status} size="lg" />
                  <span className="text-xs text-muted-foreground">{status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">8. Plan Badge</h3>
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-2">
              <PlanBadge plan="elite" />
              <PlanBadge plan="trinca" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 md:col-span-2">
          <h3 className="font-medium text-muted-foreground">9. Empty State</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <EmptyState message="Ainda não há respostas sobre suplementos." />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <EmptyState icon={Bell} message="Nenhuma resposta de reavaliação ainda." />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold border-b border-border pb-2">
          Composites de base (Goal 2/3)
        </h2>
        <p className="text-muted-foreground mt-2">
          9 componentes compostos do Passo 00 (Parte 2) que reaproveitam composites/atoms já existentes.
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">1. Stat Tile</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatTile label="Leads Captados" value="1.204" icon={Users} tone="blue" description="+12% vs. período anterior" />
            <StatTile label="Elite" value="2.468" icon={TrendingUp} tone="purple" />
            <StatTile label="Reembolsos" value="187" icon={Trash2} tone="red" description="3% do total" />
            <StatTile label="Trinca" value="48.710" icon={TrendingUp} tone="green" description="95% de adesão" />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">2. Donut Chart Card</h3>
          <div className="max-w-sm">
            <DonutChartCard
              title="Distribuição por Sexo"
              data={[
                { label: "Feminino", value: 62, color: "var(--chart-1)" },
                { label: "Masculino", value: 38, color: "var(--chart-2)" },
              ]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">3. Bar Chart Card (horizontal e vertical)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BarChartCard
              title="Categorias de Alunos"
              orientation="horizontal"
              data={[
                { label: "Elite", value: 2468, color: "var(--chart-1)" },
                { label: "Trinca", value: 48710, color: "var(--chart-2)" },
                { label: "Reembolsos", value: 187, color: "var(--chart-3)" },
              ]}
            />
            <BarChartCard
              title="Contagem por Opção"
              orientation="vertical"
              data={[
                { label: "Emagrecer", value: 340, color: "var(--chart-1)" },
                { label: "Hipertrofia", value: 512, color: "var(--chart-2)" },
                { label: "Condicionamento", value: 210, color: "var(--chart-3)" },
              ]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">4. Entity Card (com e sem expandable)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EntityCard
              title="Protocolo Hipertrofia — Fase 1"
              badges={[{ label: "Elite", variant: "accent" }, { label: "Com protocolo", variant: "secondary" }]}
              metadata={["8 exercícios", "Frequência semanal: 4x"]}
              actions={[
                { icon: Edit, onClick: () => console.log("edit"), label: "Editar" },
                { icon: Trash2, onClick: () => console.log("delete"), variant: "destructive", label: "Excluir" },
              ]}
            />
            <EntityCard
              title="Conquista — 30 dias de sequência"
              badges={[{ label: "Ativo", variant: "default" }]}
              metadata={["187 alunos desbloquearam"]}
              expandable
              actions={[{ icon: Edit, onClick: () => console.log("edit"), label: "Editar" }]}
            >
              <p className="text-sm text-muted-foreground">
                Conteúdo expandido: regras de liberação, ícone da conquista e histórico de liberações recentes.
              </p>
            </EntityCard>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">5. Entity List Header</h3>
          <Card>
            <CardContent className="p-4">
              <EntityListHeader
                title="Exercícios"
                count={48}
                actions={[{ label: "Novo Exercício", icon: Plus, onClick: () => console.log("new") }]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">6. Category Pill Filter</h3>
          <Card>
            <CardContent className="p-4">
              <CategoryPillFilter
                options={["Peito", "Costas", "Pernas", "Ombro", "Braço"]}
                active={categoryActive}
                onChange={setCategoryActive}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">7. Video Link Field</h3>
          <Card>
            <CardContent className="p-4 max-w-md">
              <VideoLinkField
                url={videoUrl}
                onUpload={(file) => setVideoUrl(URL.createObjectURL(file))}
                onRemove={() => setVideoUrl(undefined)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">8. Two Column Form Layout</h3>
          <TwoColumnFormLayout
            left={{
              title: "Dados do usuário",
              children: <Input placeholder="Nome completo" />,
            }}
            right={{
              title: "Plano e permissões",
              children: (
                <ToggleButtonGroup
                  options={[
                    { label: "Elite", value: "elite" },
                    { label: "Trinca", value: "trinca" },
                  ]}
                  value={toggleValue2}
                  onChange={setToggleValue2}
                  columns={2}
                />
              ),
            }}
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">9. Apply Value Card</h3>
          <div className="max-w-sm">
            <ApplyValueCard
              label="Prazo de avaliação global (dias)"
              value={evaluationDeadline}
              onChange={setEvaluationDeadline}
              onApply={() => console.log("apply:", evaluationDeadline)}
              lastAppliedText="Última aplicação: 14 dias, há 3 dias"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold border-b border-border pb-2">
          Composites avançados (Goal 3/3)
        </h2>
        <p className="text-muted-foreground mt-2">
          9 componentes compostos finais do Passo 00 (Parte 2), incluindo os que reaproveitam
          entity-card e progress-list-item por baixo.
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">1. Entity Edit Modal Shell (aberto)</h3>
          {editModalOpen ? (
            <EntityEditModalShell
              title="Editar protocolo"
              description="Organize em duas etapas simples: dados do protocolo e treinos."
              onClose={() => setEditModalOpen(false)}
              footer={
                <>
                  <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={() => setEditModalOpen(false)}>
                    Próximo: montar treinos
                  </Button>
                </>
              }
            >
              <Input placeholder="Nome do protocolo *" />
              <Input placeholder="Etiqueta interna (só admin vê)" />
            </EntityEditModalShell>
          ) : (
            <Card>
              <CardContent className="p-4">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(true)}>
                  Reabrir modal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">2. Wizard Tabs</h3>
          <Card>
            <CardContent className="p-4">
              <WizardTabs
                steps={[
                  { label: "1. Dados do protocolo", icon: Sparkles },
                  { label: "2. Treinos e exercícios", icon: FileStack },
                ]}
                active="1. Dados do protocolo"
                summary={[
                  { label: "PROTOCOLO", value: "Treino Experiente..." },
                  { label: "TREINOS", value: 3 },
                  { label: "EXERCÍCIOS", value: 27 },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">3. Reorderable List Item</h3>
          <div className="space-y-2 max-w-lg">
            <ReorderableListItem
              order={1}
              title="Abdominal com rolinho"
              metadata={["3 séries", "12 reps", "50s descanso"]}
              draggable
              onRemove={() => console.log("remove")}
              onExpand={() => console.log("expand")}
            />
            <ReorderableListItem
              order={2}
              title="Agachamento livre"
              metadata={["4 séries", "10 reps", "50s descanso"]}
              draggable
              onRemove={() => console.log("remove")}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">4. Linked Entity Search List</h3>
          <div className="max-w-md">
            <LinkedEntitySearchList
              query={linkedQuery}
              onQueryChange={setLinkedQuery}
              groups={[
                {
                  label: "Abdômen",
                  items: [
                    { id: "1", label: "Abdominal crunch na máquina" },
                    { id: "2", label: "Abdominal declinado com peso" },
                  ],
                },
                {
                  label: "Pernas",
                  items: [{ id: "3", label: "Agachamento livre" }],
                },
              ]}
              onSelect={(item) => console.log("select:", item.label)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">
            5. Override Rule Card (compõe Entity Card)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OverrideRuleCard
              priority={2}
              condition={'idade >= "55"'}
              result="Iniciante"
              override
              active={ruleActive1}
              onToggleActive={() => setRuleActive1((prev) => !prev)}
              onEdit={() => console.log("edit")}
              onDelete={() => console.log("delete")}
            />
            <OverrideRuleCard
              priority={1}
              condition={'experiencia = igual a "iniciante"'}
              result="Iniciante"
              active={ruleActive2}
              onToggleActive={() => setRuleActive2((prev) => !prev)}
              onEdit={() => console.log("edit")}
              onDelete={() => console.log("delete")}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">6. Field Reference Table</h3>
          <Card>
            <CardContent className="p-4">
              <FieldReferenceTable
                columns={["CAMPO", "PERGUNTA NO QUIZ", "VALORES ACEITOS"]}
                rows={[
                  { CAMPO: "experiencia", "PERGUNTA NO QUIZ": "Q6", "VALORES ACEITOS": "iniciante · intermediario · avancado" },
                  { CAMPO: "idade", "PERGUNTA NO QUIZ": "Q2", "VALORES ACEITOS": "ex: 18, 25, 55 — use operadores >= ou <=" },
                  { CAMPO: "dor_saude", "PERGUNTA NO QUIZ": "Q21", "VALORES ACEITOS": "Sim · Não" },
                  { CAMPO: "treinando", "PERGUNTA NO QUIZ": "Q7", "VALORES ACEITOS": "Sim · Não" },
                  { CAMPO: "objetivo", "PERGUNTA NO QUIZ": "Q10", "VALORES ACEITOS": "Crescer · Secar Muito · Crescer e Secar" },
                  { CAMPO: "urgencia", "PERGUNTA NO QUIZ": "Q14", "VALORES ACEITOS": "Muito alta · Alta · Média · Normal" },
                  { CAMPO: "gasto_mensal", "PERGUNTA NO QUIZ": "Q15", "VALORES ACEITOS": "Até R$ 500 · R$ 500 – R$ 1.000 · Acima de R$ 3.000" },
                  { CAMPO: "genero", "PERGUNTA NO QUIZ": "Q1", "VALORES ACEITOS": "Homem · Mulher" },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">7. Quick Profile Button Grid</h3>
          <Card>
            <CardContent className="p-4">
              <QuickProfileButtonGrid
                profiles={[
                  { label: "Iniciante, 25 anos", values: { idade: "25", experiencia: "iniciante" } },
                  { label: "Intermediário, 30 anos", values: { idade: "30", experiencia: "intermediario" } },
                  { label: "Avançado, 35 anos", values: { idade: "35", experiencia: "avancado" } },
                  { label: "Sênior 60 anos (deve forçar iniciante)", values: { idade: "60" } },
                  { label: "Com dor/lesão (deve forçar iniciante)", values: { dor_saude: "Sim" } },
                ]}
                onSelect={(profile) => console.log("profile:", profile.label)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">
            8. Period Filter Bar (com e sem onRefresh)
          </h3>
          <div className="space-y-3">
            <PeriodFilterBar
              emailFilter={periodEmail1}
              onEmailFilterChange={setPeriodEmail1}
              range={periodRange1}
              onRangeChange={setPeriodRange1}
              onRefresh={() => console.log("refresh")}
            />
            <PeriodFilterBar
              emailFilter={periodEmail2}
              onEmailFilterChange={setPeriodEmail2}
              range={periodRange2}
              onRangeChange={setPeriodRange2}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">
            9. Drilldown Question Card (compõe Entity Card + Progress List Item)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DrilldownQuestionCard
              index={13.5}
              question="Como você avalia sua evolução física desde o início dos treinos?"
              type="single_choice"
              respondedCount={117}
              arrivalPercent={54.7}
              avgTime="13s"
              alert="⚠ 53 desistiram aqui"
            />
            <DrilldownQuestionCard
              index={1}
              question="Qual é o seu gênero?"
              type="single_choice"
              respondedCount={967}
              arrivalPercent={98}
              avgTime="4s"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Design System Catalog</h1>
          <p className="text-muted-foreground">Dashboard de Telemetria Operacional</p>
        </div>

        <Tabs defaultValue="design-system">
          <TabsList>
            <TabsTrigger value="design-system">Design System</TabsTrigger>
            <TabsTrigger value="admin-crm-audit">Admin CRM — Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="design-system" className="space-y-16 mt-8">

        {/* 1. Typography */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">1. Tipografia</h2>
          <div className="space-y-4">
            <div className="grid gap-2">
              <span className="text-sm text-muted-foreground">Headers (--font-heading / Satoshi)</span>
              <h1 className="text-4xl font-heading font-bold">H1 Header Example</h1>
              <h2 className="text-3xl font-heading font-bold">H2 Header Example</h2>
              <h3 className="text-2xl font-heading font-bold">H3 Header Example</h3>
            </div>
            <div className="grid gap-2">
              <span className="text-sm text-muted-foreground">Body (--font-sans / Plus Jakarta Sans)</span>
              <p className="text-base">Body Base: The quick brown fox jumps over the lazy dog.</p>
              <p className="text-sm text-muted-foreground">Small / Muted: The quick brown fox jumps over the lazy dog.</p>
            </div>
          </div>
        </section>

        {/* 2. Colors */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">2. Cores (Tokens)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['bg-background', 'bg-foreground', 'bg-primary', 'bg-secondary', 'bg-muted', 'bg-accent', 'bg-destructive', 'bg-card', 'bg-popover', 'bg-border'].map((colorClass) => (
              <div key={colorClass} className="flex items-center gap-3 p-2 border border-border rounded-md">
                <div className={`w-8 h-8 rounded-full ${colorClass} border border-border/50`} />
                <span className="text-sm font-mono">{colorClass.replace('bg-', '')}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Spacing */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">3. Espaçamento (Radius)</h2>
          <div className="flex gap-4 items-end">
            <div className="w-16 h-16 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs">sm</div>
            <div className="w-16 h-16 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs">md</div>
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-xs">lg</div>
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-primary-foreground text-xs">xl</div>
          </div>
        </section>

        {/* 4. Atomic Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">4. Componentes Atômicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Button</h3>
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Badge</h3>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Input & Select</h3>
              <div className="flex flex-col gap-2 max-w-sm">
                <Input placeholder="Search leads..." />
                <Select>
                  <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Progress</h3>
              <div className="max-w-sm space-y-4">
                <Progress value={33} />
                <Progress value={85} className="[&>div]:bg-success" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Sheet (Drawer)</h3>
              <Sheet>
                <SheetTrigger render={<Button variant="outline" />}>Open Drawer</SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Timeline Drawer</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">Event timeline goes here...</div>
                </SheetContent>
              </Sheet>
            </div>
            
             <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Card Base</h3>
              <Card>
                <CardHeader>
                  <CardTitle>Base Card</CardTitle>
                  <CardDescription>Description area</CardDescription>
                </CardHeader>
                <CardContent>Content area</CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 5. Composites */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">5. Componentes Compostos</h2>
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">App Shell (Mockup)</h3>
              <p className="text-xs text-muted-foreground">
                Ilustração estática — o AppShell real usa sidebar `fixed`/`h-svh` ancorada ao
                viewport, incompatível com uma preview contida em caixa pequena.
              </p>
              <div className="border border-border rounded-md overflow-hidden h-[300px] flex">
                <div className="flex w-48 shrink-0 flex-col gap-3 bg-sidebar p-3 text-sidebar-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                      TT
                    </div>
                    <span className="font-bold">Trinca</span>
                  </div>
                  <p className="text-xs font-medium text-sidebar-foreground/70">Menu</p>
                  <div className="space-y-1">
                    {["ROI de Campanhas", "Respostas", "Resultados"].map((label) => (
                      <div
                        key={label}
                        className="truncate rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-1 flex-col bg-background">
                  <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
                    <div className="font-heading font-bold text-primary">Dashboard</div>
                  </div>
                  <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
                    Content Area
                  </div>
                </div>
              </div>
            </div>



            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">Filter Bar</h3>
              <DashboardFiltersProvider>
                <FilterBar />
              </DashboardFiltersProvider>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground">Metric Card</h3>
                <MetricCard title="Leads Captados" value="1,204" delta="+12%" deltaType="positive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-muted-foreground">Chart Card</h3>
                <ChartCard title="Conversões por Etapa">
                  <div className="h-24 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">Chart Placeholder</div>
                </ChartCard>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">Data Grid</h3>
              <DataGrid 
                columns={["Lead", "Data", "Origem", "Status"]} 
                data={[
                  ["João Silva", "Hoje 10:45", "Meta Ads", <Badge variant="secondary" key="1">Contato</Badge>],
                  ["Maria Souza", "Ontem", "Google", <Badge variant="destructive" key="2">Sem Contato</Badge>]
                ]} 
              />
            </div>
          </div>
        </section>

        {/* 6. States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">6. Estados (States)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <Button disabled>Disabled Button</Button>
             <Card className="opacity-50"><CardContent className="p-4 flex justify-center">Loading...</CardContent></Card>
             <MetricCard className="border-destructive" title="Error State" value="---" delta="Connection lost" deltaType="negative" />
             <div className="flex items-center gap-2 p-2 rounded bg-success/20 text-success text-sm font-medium border border-success/30">Success Connect</div>
          </div>
        </section>

        {/* 7. Images & Assets */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b border-border pb-2">7. Imagens & Assets</h2>
          <div className="p-8 border border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-medium">Nenhum asset de imagem necessário</h3>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              Conforme definido em docs/frontend-briefing.md, este projeto (Dashboard de Telemetria Operacional) 
              tem natureza UI/Dados estrita e não utiliza ilustrações, banners, fotografias ou artes externas. 
              Tudo é resolvido via tipografia, tokens CSS, componentes e ícones Lucide.
            </p>
          </div>
        </section>

          </TabsContent>

          <TabsContent value="admin-crm-audit" className="mt-8">
            <AdminCrmAuditSection />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
