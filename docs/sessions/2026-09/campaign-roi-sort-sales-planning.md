# Ordenação de Campanhas por Vendas Front (Crescente / Decrescente) — Planning Output (v1)

> **Status:** PLANEJADO — Aguardando aprovação  
> **Data:** 2026-09-15  
> **Scope:** `src/pages/campaign-roi.tsx`, `src/components/composites/filter-bar.tsx`  
> **Files:** 2 arquivos modificados  
> **Risk:** 🟢 LOW

---

## 1. Contexto

Na página de ROI de Campanhas (`/roi-campanhas`), as campanhas agrupadas por fonte de tráfego são atualmente renderizadas na ordem padrão vinda do backend, sem permitir ao operador analisar rapidamente quais campanhas tiveram maior ou menor volume de vendas.

Conforme alinhamento na etapa de elicitação com o stakeholder:
- A métrica base da ordenação é **Vendas Front** (`front_orders`).
- O controle de alternância será um botão na barra superior (`FilterBar`) com estado inicial **Decrescente** (Maior volume ↓) e alternância para **Crescente** (Menor volume ↑).

---

## 2. Referência de Código Mapeada

### 2.1 Agrupamento e Renderização Atual em `campaign-roi.tsx`
[melhor-versao-dashboard/src/pages/campaign-roi.tsx L73-L81](file:///Users/brunogovas/Projects/Pandora-Box/melhor-versao-dashboard/src/pages/campaign-roi.tsx#L73-L81)

```tsx
  const rows = data ?? []
  const groupedRows = groupRowsByTrafficSource(rows)
  const sourceOrder = Object.keys(groupedRows).sort((a, b) => {
    const totalDelta = sum(groupedRows[b], "total_revenue_cents") - sum(groupedRows[a], "total_revenue_cents")
    return totalDelta || labelTrafficSource(a).localeCompare(labelTrafficSource(b))
  })
  const visibleSourceOrder = filters.trafficSourceId
    ? sourceOrder.filter((source) => source === filters.trafficSourceId)
    : sourceOrder
```
↑ Esta ordenação será estendida para ordenar tanto os grupos quanto as linhas internas de cada fonte com base no estado `sortDirection`.

### 2.2 Estrutura da `FilterBar`
[melhor-versao-dashboard/src/components/composites/filter-bar.tsx L192-L218](file:///Users/brunogovas/Projects/Pandora-Box/melhor-versao-dashboard/src/components/composites/filter-bar.tsx#L192-L218)

```tsx
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <DateRangeCalendar
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          is24hActive={filters.is24hActive}
          onChange={(range) =>
            setFilters((current) => ({
              ...current,
              ...range,
            }))
          }
        />
        {onReload && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Atualizar dados"
            onClick={onReload}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        )}
      </div>
```
↑ Adicionaremos uma prop opcional `actions?: React.ReactNode` para acomodar o botão de ordenação sem quebrar retrocompatibilidade com as demais páginas que usam `FilterBar`.

---

## 3. Lógica de Implementação

### 3.1 Estado e Ordenação de Linhas em `campaign-roi.tsx`
**Origem:** `[CRIADO]`

```tsx
export type SortDirection = "desc" | "asc"

// Dentro do componente CampaignRoiPage:
const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

// Ordenação de grupos de fontes com desempate
const sourceOrder = Object.keys(groupedRows).sort((a, b) => {
  const aOrders = sum(groupedRows[a], "front_orders")
  const bOrders = sum(groupedRows[b], "front_orders")
  const delta = sortDirection === "desc" ? bOrders - aOrders : aOrders - bOrders
  return delta || labelTrafficSource(a).localeCompare(labelTrafficSource(b))
})

// Ordenação das linhas dentro de cada fonte
function sortSourceRows(sourceRows: CampaignRoiRow[]) {
  return [...sourceRows].sort((a, b) => {
    const aVal = Number(a.front_orders ?? 0)
    const bVal = Number(b.front_orders ?? 0)
    if (sortDirection === "desc") {
      return bVal - aVal || (b.total_revenue_cents ?? 0) - (a.total_revenue_cents ?? 0)
    }
    return aVal - bVal || (a.total_revenue_cents ?? 0) - (b.total_revenue_cents ?? 0)
  })
}
```

### 3.2 Botão de Alternância
**Origem:** `[CRIADO]`

```tsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
  className="h-8 gap-1.5 text-xs font-sans border-border/80 hover:border-primary/50"
  title={sortDirection === "desc" ? "Ordenar: Menor volume de vendas primeiro" : "Ordenar: Maior volume de vendas primeiro"}
>
  {sortDirection === "desc" ? (
    <>
      <ArrowDownWideNarrow className="size-3.5 text-primary" />
      <span>Vendas Front: Maior ↓</span>
    </>
  ) : (
    <>
      <ArrowUpNarrowWide className="size-3.5 text-primary" />
      <span>Vendas Front: Menor ↑</span>
    </>
  )}
</Button>
```

---

## 4. Arquitetura de Componentes

```mermaid
graph TD
    CampaignRoiPage --> FilterBar[FilterBar with actions slot]
    FilterBar --> SortButton[Button: Vendas Front Maior/Menor]
    SortButton -->|toggle sortDirection| State[sortDirection: 'desc' | 'asc']
    State --> SourceOrderSort[Ordenação das fontes de tráfego]
    State --> RowsSort[sortSourceRows: Ordenação interna das campanhas]
    RowsSort --> DataGrid[DataGrid por fonte de tráfego]
```

---

## 5. CSS/SCSS Reference

*Utiliza componentes existentes (`Button` e ícones `lucide-react`) com classes padrão do Tailwind v4 (`border-border/80`, `text-primary`), compatível tanto com o tema Padrão quanto com o tema Elite.*

---

## 6. Novos Componentes

*Nenhum novo componente; ajuste pontual em `FilterBar` (prop opcional) e `CampaignRoiPage`.*

---

## 7. Componentes Modificados

### 7.1 `src/components/composites/filter-bar.tsx`
- Adicionar `actions?: React.ReactNode` à interface `FilterBarProps`.
- Renderizar `{actions}` logo antes do seletor de data na div de ações.

### 7.2 `src/pages/campaign-roi.tsx`
- Importar `ArrowDownWideNarrow` e `ArrowUpNarrowWide` de `lucide-react`.
- Adicionar estado `sortDirection`.
- Aplicar `sortSourceRows` na renderização das tabelas.
- Passar o botão no slot `actions` do `FilterBar`.

---

## 8. i18n Keys

*N/A — Aplicação monolíngue (pt-BR).*

---

## 9. Files Summary

| Action | File | Risk |
|--------|------|------|
| **MODIFY** | `src/components/composites/filter-bar.tsx` | 🟢 LOW |
| **MODIFY** | `src/pages/campaign-roi.tsx` | 🟢 LOW |

---

## 10. Implementation Order

1. **Phase A:** Adicionar prop `actions` na `FilterBar` sem afetar chamadas existentes.
2. **Phase B:** Implementar o estado `sortDirection`, lógica de ordenação e botão no `CampaignRoiPage`.
3. **Phase C:** Executar `npm run build` e validação de linter.

---

## 11. Rollback Plan

```
Componentes modificados:
├── Git Ref: HEAD antes da implementação
├── Revert: git checkout HEAD -- src/components/composites/filter-bar.tsx src/pages/campaign-roi.tsx
└── Validação: npm run build
```

---

## 12. Verification Plan

| # | Test Case | Route | Expected |
|---|-----------|-------|----------|
| 1 | Carga Inicial (Padrão Decrescente) | `/roi-campanhas` | As campanhas em cada fonte de tráfego aparecem ordenadas da maior para a menor quantidade de vendas front. |
| 2 | Alternância para Crescente | `/roi-campanhas` | Ao clicar no botão, o rótulo muda para "Vendas Front: Menor ↑" e a lista inverte a ordem (menor número de vendas primeiro). |
| 3 | Filtro de Fonte de Tráfego Ativo | `/roi-campanhas` | Selecionar "Facebook" ou "TikTok" -> A ordenação por Vendas Front continua respeitada perfeitamente. |
| 4 | Build & Lint | Terminal | `npm run build` passa com 0 erros. |

---

## 13. Handoff

*N/A — Ajuste estritamente de frontend na UI de campanhas.*
