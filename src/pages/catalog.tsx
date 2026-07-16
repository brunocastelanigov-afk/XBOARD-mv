import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/atoms/card"
import { Progress } from "@/components/atoms/progress"
import { Badge } from "@/components/atoms/badge"
import { Input } from "@/components/atoms/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/atoms/sheet"

import { AppShell } from "@/components/composites/app-shell"
import { LeadsTabBar } from "@/components/composites/leads-tab-bar"
import { FilterBar } from "@/components/composites/filter-bar"
import { DataGrid } from "@/components/composites/data-grid"
import { MetricCard } from "@/components/composites/metric-card"
import { ChartCard } from "@/components/composites/chart-card"

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Design System Catalog</h1>
          <p className="text-muted-foreground">Dashboard de Telemetria Operacional</p>
        </div>

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
                <SheetTrigger asChild><Button variant="outline">Open Drawer</Button></SheetTrigger>
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
              <div className="border border-border rounded-md overflow-hidden h-[300px] relative">
                <AppShell title="Dashboard">
                  <div className="p-8 text-center text-muted-foreground">Content Area</div>
                </AppShell>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">Leads Tab Bar</h3>
              <LeadsTabBar />
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">Filter Bar</h3>
              <FilterBar />
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

      </div>
    </div>
  )
}
