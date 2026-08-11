# Passo 01 — Expansão CRM do Admin Panel: Wireframes de Baixa Fidelidade

Date: 2026-08-10
Status: Rascunho para revisão do usuário
Fonte: `melhor-versao-dashboard/docs/admin-crm-expansion-passo-00.md` (features +
tabela de componentes) + prints reais em `~/Downloads/adm-prints/**` + shell
existente (`src/components/composites/app-shell.tsx`,
`src/components/composites/app-sidebar.tsx`).

> Este documento cobre **apenas a área de conteúdo** renderizada dentro de
> `<AppShell>` (a região `<main>` com `overflow-y-auto`, à direita do
> `<AppSidebar>` e abaixo do header de 56px/`h-14`). Sidebar, header e bottom
> nav mobile já existem como chrome e não são redesenhados aqui — quando um
> print mostra sidebar/bottom-nav, isso serve só para confirmar contexto, não
> gera região nova.
>
> Correção de nomenclatura herdada do Passo 00: pasta `classification/` = P09
> Regras; pasta `regras/` = P10 Liberar usuário.
>
> P01 e P02 não têm prints (spec só por texto no briefing) — layout é
> proposto por analogia com os padrões visuais confirmados em P03–P11 (mesmo
> grid de `stat-tile`, mesma estrutura de `entity-list-header` etc.), **não**
> confirmado pixel-a-pixel. Sinalizado em cada seção.
>
> Fora de escopo: código React/markup, cores/tipografia/tokens, e a decisão
> de acesso a dados (já resolvida no briefing, seção 05.4).

---

## Convenção de leitura

- **Grid de regiões**: bloco ASCII por página, cada letra = uma região de
  conteúdo dentro do `<main>` do shell. Regiões empilham em coluna única
  abaixo do breakpoint mínimo declarado.
- **Componente por região**: nome exato da tabela do Passo 00 (Parte 2) ou
  átomo/composite já existente (Parte 2, notas de fechamento). Quando a
  região é composta por mais de um componente, listados na ordem visual
  (topo→base, esquerda→direita).
- **Sticky**: elementos que permanecem fixos durante o scroll do `<main>`
  (o header do shell já é `shrink-0`, fora da área de scroll — regiões aqui
  marcadas "sticky" são sticky *dentro* do `<main>`, um nível abaixo).
- **Breakpoint mínimo assumido**: menor largura em que o grid da página
  descrito abaixo é válido como está. Abaixo disso, colunas colapsam para 1
  (empilhado), seguindo o mesmo piso de 768px (`md`) que
  `src/hooks/use-mobile.ts` já usa para o colapso do `AppSidebar` — nenhuma
  página aqui assume menos que isso, e o P03/P04/P06 mostram nos prints uma
  bottom nav mobile própria do shell abaixo desse ponto (não redesenhada
  aqui).

---

## P01 — Dashboard

*(Sem print — spec por texto, briefing seção 04. Layout por analogia com o
grid de `stat-tile` + `bar-chart-card`/`donut-chart-card` confirmado em
prints de P05/P06.)*

**Breakpoint mínimo assumido:** `lg` (≥1024px) — grid de métricas em 4
colunas exige essa largura para não espremer os `stat-tile`; abaixo disso
colapsa para 2 colunas, depois 1.

```
┌─────────────────────────────────────────────────────────────┐
│ A — GRID DE MÉTRICAS (4 col × 2 linhas, wrap)                │
├───────────────────────────────┬───────────────────────────────┤
│ B1 — GRÁFICO: Distribuição    │ B2 — GRÁFICO: Objetivos        │
│      de idade                 │                                 │
├───────────────────────────────┴───────────────────────────────┤
│ B3 — GRÁFICO: Frequência (full width, abaixo de B1/B2)         │
├───────────────────────────────┬───────────────────────────────┤
│ C1 — CARD: Sugestões recentes │ C2 — CARD: Avaliações recentes │
│                                │      de treino                 │
└───────────────────────────────┴───────────────────────────────┘
```

| Região | Feature (Passo 00 Parte 1) | Componente(s) |
|---|---|---|
| A | Cards "Total usuários", "Total Trinca", "Total Elite", "Reembolsos", "Sem acesso", "Freq. média alta", "Freq. média baixa" | `stat-tile` ×7 |
| B1 | Gráfico "Distribuição de idade" | `donut-chart-card` |
| B2 | Gráfico "Objetivos" | `bar-chart-card` |
| B3 | Gráfico "Frequência" | `bar-chart-card` |
| C1 | Card "Sugestões recentes" (lista) | `entity-list-header` (título "Sugestões recentes") + `entity-card` ×N (linha por sugestão) |
| C2 | Card "Avaliações recentes de treino" (lista) | `entity-list-header` (título) + `entity-card` ×N (linha por avaliação) |

**Densidade/ordem de leitura:** A (métricas, scan horizontal) → B1–B3
(gráficos, prioridade de scroll média) → C1/C2 (listas, menor prioridade,
primeiro a sair da viewport inicial). Nada é sticky — página é só leitura,
sem ações de topo a fixar.

**Estados:**
- Vazio: C1/C2 usam `empty-state` quando não há sugestões/avaliações
  recentes; gráficos B1–B3 mostram `empty-state` centralizado se não há
  dados no período (não há filtro de período nesta página).
- Carregando: `skeleton` no lugar de cada `stat-tile` (A) e de cada card de
  gráfico (B1–B3) e lista (C1/C2) — a página inteira nasce em skeleton até o
  primeiro fetch resolver, sem stream progressivo (não há dependência entre
  regiões).
- Role sem permissão de edição: dashboard é 100% leitura — nenhuma região
  muda entre roles.

---

## P02 — Usuários

*(Sem print — spec por texto, briefing seção 04. Layout por analogia com o
grid de métricas + filtros confirmado em P04/P09, e `apply-value-card`
confirmado em print no P11 — mesmo componente, reaproveitado aqui conforme
nota do Passo 00.)*

**Breakpoint mínimo assumido:** `lg` (≥1024px) — 5 `stat-tile` em linha +
barra de filtros com 5 campos exigem essa largura; abaixo colapsa em grid
2-col e filtros empilham.

```
┌─────────────────────────────────────────────────────────────┐
│ A — ENTITY-LIST-HEADER ("Usuários")                          │
├─────────────────────────────────────────────────────────────┤
│ B — GRID DE MÉTRICAS (5 col)                                  │
├─────────────────────────────────────────────────────────────┤
│ C — SEARCH-INPUT + FILTER-BAR (objetivo/sexo/renda/freq/status)│ ← sticky
├─────────────────────────────────────────────────────────────┤
│ D — DATA-GRID: ranking por faturamento total por lead          │
├─────────────────────────────────────────────────────────────┤
│ E — APPLY-VALUE-CARD: Prazo de avaliação global                │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| A | Título de página (implícito, padrão de header reaproveitado das demais páginas de listagem) | `entity-list-header` |
| B | Cards "Total", "Trinca", "Elite", "Reembolso", "Sem acesso" | `stat-tile` ×5 |
| C | Busca por nome/e-mail; filtros objetivo, sexo, renda, frequência, status (elite/trinca/vencendo/reembolsada/sem acesso) | `search-input` + `filter-bar` |
| D | Ranking por faturamento total (receita − reembolso) por lead | `data-grid` |
| E | Card "Prazo de avaliação global" com ação "Aplicar" | `apply-value-card` |

**Densidade/ordem de leitura:** B (métricas) → C (filtros, sticky logo
abaixo do header para permanecer acessível enquanto D rola) → D (tabela,
maior prioridade de scroll, é o conteúdo principal) → E (card isolado,
menor prioridade, fim da página).

**Estados:**
- Vazio: D usa `empty-state` quando filtro não retorna nenhum lead.
- Carregando: `skeleton` em B (métricas) e D (linhas da tabela); C
  permanece interativo imediatamente (filtros não dependem do fetch).
- Role sem permissão de edição: E (Prazo de avaliação global) — campo
  numérico e botão "Aplicar" ficam somente-leitura (valor exibido, sem
  input editável nem botão ativo); D perde a ação de deep-link para edição
  do lead, mantendo-se somente leitura.

---

## P03 — Protocolos (abas: Protocolos / Treinos)

*(Prints: `workouts/18.51.39` a `18.58.46`.)*

**Breakpoint mínimo assumido:** `lg` (≥1024px) — modal "Editar protocolo"
usa layout de 3 mini-cards de resumo lado a lado + formulário largo; abaixo
disso os mini-cards colapsam para 1 coluna.

### Sub-navegação de topo

```
┌─────────────────────────────────────────────────────────────┐
│ NAV — pill/segmented "Protocolos" | "Treinos"                 │ ← sticky
└─────────────────────────────────────────────────────────────┘
```
Navegação por `atoms/tabs` (reaproveitado direto, conforme nota de
fechamento do Passo 00).

### Aba "Protocolos"

```
┌─────────────────────────────────────────────────────────────┐
│ A — ENTITY-LIST-HEADER ("Protocolos de treino", contador,      │
│     ações "Limpar duplicados" + "Novo protocolo")              │
├─────────────────────────────────────────────────────────────┤
│ B — BLOCO "Categorias administrativas" (badges de contagem)    │
├─────────────────────────────────────────────────────────────┤
│ C — SEARCH-INPUT ("Buscar protocolo...")                       │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ D — LISTA DE CATEGORIAS (Categoria: Protocolo A, B, ...)        │
│     cada categoria = ENTITY-CARD contendo lista aninhada de     │
│     ENTITY-CARD (um por protocolo), expandível                 │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| A | Título "Protocolos de treino" + contador "N protocolo(s)"; botões "Limpar duplicados" e "+ Novo protocolo" | `entity-list-header` |
| B | Chips "Protocolo A: 6", "Protocolo B: 6" | `atoms/badge` ×N (direto) |
| C | Campo "Buscar protocolo..." | `search-input` |
| D | Card de categoria (avatar letra, título, subtítulo, badge "Visível apenas no painel"); dentro, linha de protocolo (badge tag, nome, nota interna, metadados, badge de nível, botão Liberar, ícones copiar/editar/excluir/expandir); ao expandir, sub-lista "Treino 1/2/3" (bolha numerada, metadados, link Editar) | `entity-card` (categoria) → `entity-card` (protocolo, `expandable`) → `entity-card` (treino, variante compacta, reaproveitada) |

**Modal "Editar protocolo"** (abre a partir do ícone editar em D):

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: ícone + "Editar protocolo" + subtítulo + fechar (X)   │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ TABS: "1. Dados do protocolo" | "2. Treinos e exercícios"     │
│ + 3 mini-cards de resumo (Protocolo/Treinos/Exercícios)       │
├─────────────────────────────────────────────────────────────┤
│ CORPO — Etapa 1: Nome*, Categoria*, Etiqueta interna,          │
│         Descrição, Nível, Objetivo, Frequência semanal,        │
│         Imagem de capa (URL)                                   │
│ CORPO — Etapa 2: lista de treinos expansíveis; dentro de cada:  │
│         nome, ordem, descrição, duração, trocar imagem,         │
│         lista reordenável de exercícios; dentro de cada         │
│         exercício: nome, busca/vínculo de exercício da           │
│         biblioteca, trocar imagem, vídeo (upload + URL +         │
│         preview + remover), tipo, séries, repetições,           │
│         descanso, como executar, observações                    │
├─────────────────────────────────────────────────────────────┤
│ FOOTER: "Cancelar" | "Próximo: montar treinos" / "Salvar        │ ← sticky
│         protocolo"                                              │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| Header+Tabs+mini-cards | Cabeçalho do modal, navegação por 2 etapas, resumo Protocolo/Treinos/Exercícios | `entity-edit-modal-shell` + `wizard-tabs` |
| Etapa 1 | Campos Nome, Categoria, Etiqueta interna, Descrição, Nível, Objetivo, Frequência semanal (stepper), Imagem de capa | `atoms/input`/`atoms/select` (direto) + `stepper-input` (Frequência semanal) |
| Etapa 2 — treino | "+ Adicionar treino"; card de treino expansível (nome, metadados, "+ Exercício", excluir, chevron); campos nome/ordem/descrição/duração; "Trocar imagem do treino" | `atoms/button` + `entity-card` (treino expansível) + `dropzone-button` (trocar imagem) |
| Etapa 2 — exercícios | Lista reordenável de exercícios (drag-handle, número, nome, metadados, excluir, chevron); busca de exercício cadastrado agrupada por grupo muscular; campos do exercício em edição (nome, tipo, séries, repetições, descanso, como executar, observações); vídeo (upload, URL, preview, remover) | `reorderable-list-item` + `linked-entity-search-list` + `stepper-input` (Séries) + `video-link-field` |
| Footer | Botões "Cancelar"/"Próximo"/"Salvar protocolo" | parte do `entity-edit-modal-shell` (slot `footer`) |

### Aba "Treinos" (Ajustes por aluno)

```
┌─────────────────────────────────────────────────────────────┐
│ A — TÍTULO "Treinos individuais" + subtítulo                   │
├─────────────────────────────────────────────────────────────┤
│ B — GRID DE MÉTRICAS (2×2): Alunos no app / Com protocolo /     │
│     Próximo protocolo pendente / Sem protocolo                  │
├─────────────────────────────────────────────────────────────┤
│ C — SEARCH-INPUT (e-mail exato) + SELECT (Todos os planos) +    │ ← sticky
│     botão Buscar                                                │
├─────────────────────────────────────────────────────────────┤
│ D — INDICADOR DE PAGINAÇÃO + controles Anterior/Próxima          │
├─────────────────────────────────────────────────────────────┤
│ E — LISTA DE ALUNOS (nome, e-mail, badge plano, botão            │
│     "Editar treinos", badge protocolo vinculado)                 │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| A | Título "Treinos individuais" + subtítulo | texto simples, sem componente próprio |
| B | 4 cards "Alunos no app", "Com protocolo", "Próximo protocolo pendente", "Sem protocolo" (cada um com ícone de status colorido) | `stat-tile` ×4 (prop `icon` usando `status-icon` internamente: pessoas/verde-check/amarelo-relógio/azul-cadeado) |
| C | Busca por e-mail exato, dropdown "Todos os planos", botão Buscar | `search-input` + `atoms/select` (direto) + `atoms/button` |
| D | "Mostrando 1–1.000 de 51.864 aluno(s)", "Anterior"/"Próxima" | `data-grid` (paginação embutida) |
| E | Nome, e-mail, badge plano (Elite/Trinca), botão "Editar treinos", badge "Protocolo A" com ícone de redirect | `entity-card` (usa `plan-badge` para o badge de plano) |

Modal "Editar treino individual" reutiliza **exatamente** a mesma estrutura
do modal "Editar protocolo" acima (mesmo `entity-edit-modal-shell` +
`wizard-tabs`), diferindo só no título do header.

**Densidade/ordem de leitura (aba Protocolos):** A (header+ações, prioridade
alta) → B (contexto, baixo) → C (sticky, sempre acessível ao rolar D) → D
(lista principal, maior prioridade de scroll, categorias colapsadas por
padrão exceto a primeira). **Modal:** header+tabs+resumo sticky no topo,
corpo rola, footer sticky na base — todas as telas do modal (etapa 1 e 2)
compartilham esse footer fixo.

**Densidade/ordem de leitura (aba Treinos):** B (métricas) → C (sticky,
busca exige e-mail exato — usuário precisa buscar antes de ver E) → D → E.

**Estados:**
- Vazio: D/E mostram `empty-state` quando a categoria não tem protocolos ou
  a busca por e-mail não encontra aluno; no modal, "Exercícios" mostra
  `empty-state` se o treino ainda não tem nenhum exercício adicionado.
- Carregando: `skeleton` nos cards de B, nas linhas de D/E, e no modal
  enquanto carrega os dados do protocolo antes de abrir a etapa 1.
- Role sem permissão de edição: botões "Novo protocolo", "Limpar
  duplicados", "Liberar", ícones editar/excluir/copiar em D somem;
  categorias continuam expansíveis (leitura); botão "Editar treinos" em E
  vira somente visualização (abre o modal em modo read-only, sem footer de
  salvar); badge "Visível apenas no painel" permanece visível para todos.

---

## P04 — Exercícios

*(Prints: `exercises/19.19.40`, `19.19.49`, `19.19.55`.)*

**Breakpoint mínimo assumido:** `md` (≥768px) — página é uma lista vertical
simples; pills de categoria fazem wrap naturalmente abaixo disso sem quebrar
o layout.

```
┌─────────────────────────────────────────────────────────────┐
│ A — ENTITY-LIST-HEADER ("Exercícios", contador "67           │
│     exercícios", botão "+ Novo Exercício")                     │
├─────────────────────────────────────────────────────────────┤
│ B — SEARCH-INPUT ("Buscar exercício...")                       │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ C — CATEGORY-PILL-FILTER (Todos/Peito/Ombros/.../Panturrilhas) │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ D — LISTA DE EXERCÍCIOS (1 coluna, cards empilhados)            │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| A | Título "Exercícios", "67 exercícios", botão "Novo Exercício" | `entity-list-header` |
| B | Campo de busca full-width | `search-input` |
| C | Pills de categoria (Todos, Peito, Ombros, Costas, Bíceps, Tríceps, Abdômen, Pernas, Panturrilhas) | `category-pill-filter` |
| D | Nome, badge grupo muscular, badge "Vídeo", "Equipamento: X", descrição curta, ícones editar/excluir | `entity-card` |

**Modal "Editar exercício":**

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: "Editar exercício" + subtítulo + fechar (X)            │ ← sticky
├──────────────────────────────┬──────────────────────────────┤
│ E1 — Dados básicos: Nome*,    │ E2 — Vídeo demonstrativo:      │
│      Grupo muscular,          │      upload, URL, preview,     │
│      Equipamento              │      remover                   │
├──────────────────────────────┴──────────────────────────────┤
│ E3 — Instruções do exercício (textarea)                        │
├─────────────────────────────────────────────────────────────┤
│ FOOTER: "Cancelar" | "Salvar exercício"                         │ ← sticky
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| Header/Footer | Estrutura do modal | `entity-edit-modal-shell` |
| E1 | Nome*, Grupo muscular, Equipamento | `atoms/input`/`atoms/select` (direto) |
| E2 | "Trocar arquivo de vídeo", URL, preview (thumbnail+play+"Watch on YouTube"), "Remover vídeo" | `dropzone-button` + `video-link-field` |
| E3 | Textarea de instrução | `atoms/input` (variante textarea, direto) |

**Densidade/ordem de leitura:** A → B/C (sticky, filtros sempre visíveis
enquanto D rola — é a interação primária da página) → D (lista principal).
Modal: header sticky, corpo em 2 colunas (E1 esquerda / E2 direita) rola
junto, E3 abaixo em largura total, footer sticky.

**Estados:**
- Vazio: D usa `empty-state` tanto para "sem exercícios cadastrados" quanto
  para "busca sem resultado" (mesma região, mensagem diferente) — sinalizado
  no Passo 00 como não observado nos prints, mas necessário.
- Carregando: `skeleton` nos cards de D e nas pills de C (contador "67
  exercícios" em skeleton até resolver).
- Role sem permissão de edição: botão "Novo Exercício" em A some; ícones
  editar/excluir em D somem; clique no card abre o modal em modo
  leitura (sem footer "Salvar").

---

## P05 — Avaliação / Quiz

*(Prints: `quiz/19.29.37` a `19.35.54`. Página mais densa do escopo — 4
sub-tabs de nível 1/2 dentro de "Quiz" + 3 sub-tabs dentro de "Respostas de
Avaliação", cada uma com seu próprio grid.)*

> ⚠️ **Decisão de escopo — edição de Quiz fica pós-MVP.** Conforme
> `treino-trinca-app/docs/briefing-admin-crm-expansion.md` (seção 00,
> constraints globais: *"Edição de quiz fica pós-MVP (arquitetura
> diferente). Esta rodada só implementa leitura de respostas de quiz."*) e
> seção de mapeamento do P05 (*"Dentro de Quiz: sub-tabs Quiz Início / Quiz
> Reavaliação / Páginas Especiais / Página de Fim (edição fica pós-MVP —
> implementar como somente leitura nesta rodada, ou ocultar o CRUD e manter
> a listagem)"*), e conforme a nota já herdada no Passo 00 (*"edição fica
> pós-MVP, mas as features abaixo documentam tudo que é visível para
> orientar a versão somente-leitura desta rodada"*) — a decisão tomada
> **nesta rodada é ocultar o CRUD por completo**, não apenas torná-lo
> somente-leitura. As três superfícies de edição abaixo **não serão
> construídas agora**: modal "Editar Pergunta" (Quiz Início / Quiz
> Reavaliação), ação de editar em "Páginas Especiais", e toda a superfície
> de edição de "Página de Fim" (nome/link da aba, URL do vídeo VSL, HTML da
> VSL, blocos "Títulos e textos" e "Botões da página", preview + salvar).
> Cada uma delas recebe o disclaimer específico correspondente logo abaixo,
> junto da região onde apareceria. As regiões de **listagem/leitura**
> (cards de pergunta em D, card de página especial, e a navegação por abas
> de "Página de Fim") continuam no escopo — só o CRUD é adiado.

**Breakpoint mínimo assumido:** `xl` (≥1280px) — é a página com mais campos
lado a lado simultâneos (blocos "Títulos e textos"/"Botões da página" com
color-picker + stepper + select na mesma linha); abaixo disso os campos de
um mesmo bloco empilham em 2 depois 1 coluna.

### Header + navegação (comum a toda a página)

> ⚠️ **Não implementar nesta rodada.** Botões "+ Carregar do PDF" e "+ Nova
> Pergunta" em `A` são entrada de criação de quiz — mesmo CRUD pós-MVP dos
> disclaimers acima. `A` nesta rodada mostra só título + contador, sem
> ações.

```
┌─────────────────────────────────────────────────────────────┐
│ A — ENTITY-LIST-HEADER ("Gestão do Quiz", contador "23        │ ← sticky
│     perguntas · 16 avaliações · 1 páginas especiais" — sem      │
│     botões nesta rodada, ver disclaimer acima)                  │
├─────────────────────────────────────────────────────────────┤
│ B — NAV nível 1: card "Quiz" | card "Respostas de Avaliação"   │ ← sticky
└─────────────────────────────────────────────────────────────┘
```
`A` = `entity-list-header`. `B` = `atoms/tabs` (variante cards com
ícone+descrição, direto).

### B.1 — Sub-tab "Quiz" → nível 2: Quiz Início / Quiz Reavaliação / Páginas Especiais / Página de Fim

> ⚠️ A 4ª aba de nível 2, **"Página de Fim"**, não tem conteúdo de leitura
> próprio — é 100% superfície de edição (builder de página VSL), então a
> mesma decisão de escopo do disclaimer acima (edição de quiz pós-MVP) se
> aplica à aba inteira: **`C` expõe só 3 abas nesta rodada** ("Quiz
> Início", "Quiz Reavaliação", "Páginas Especiais"); "Página de Fim" fica
> oculta até a edição de quiz entrar em escopo, e é documentada na seção
> "Página de Fim" abaixo apenas como referência futura.

```
┌─────────────────────────────────────────────────────────────┐
│ C — NAV nível 2 (3 abas nesta rodada, com badge de contagem;   │ ← sticky
│     "Página de Fim" oculta — ver disclaimer acima)              │
├─────────────────────────────────────────────────────────────┤
│ D — LISTA DE PERGUNTAS (1 coluna, cards empilhados)             │
└─────────────────────────────────────────────────────────────┘
```
`C` = `atoms/tabs` + `atoms/badge` (contadores 23/16/1).

**"Quiz Início" (23) / "Quiz Reavaliação" (16):**

| Região | Feature | Componente(s) |
|---|---|---|
| D | Número de ordem, texto, badge tipo, badge contagem de opções, badge "Auto-avanço", ícone olho/toggle (só em Quiz Início) | `entity-card` (leitura — sem ícones editar/excluir, ver disclaimer abaixo) |

> ⚠️ **Não implementar nesta rodada.** Modal "Editar Pergunta" (Tipo,
> Ordem, Pergunta*, Subtítulo, Opções* + "Adicionar opção", toggle
> "Avançar automaticamente") — edição de quiz é pós-MVP (briefing, seção
> 00 e mapeamento P05). Decisão: ocultar o CRUD, não apenas somente-leitura
> — os ícones editar/excluir somem do card em D para toda role, não só para
> quem não tem permissão de edição.

**"Páginas Especiais" (1):**

| Região | Feature | Componente(s) |
|---|---|---|
| D | Banner explicativo do recurso | `atoms/card` (direto) |
| D | Card: badge posição decimal "5.5", título, badges ("Tem copy", "Botão: Continuar", "Tem imagem", "Padrão do quiz"), preview de copy entre aspas | `entity-card` (leitura — sem ícone editar, ver disclaimer abaixo) |

> ⚠️ **Não implementar nesta rodada.** Ação de editar (ícone lápis, único
> ícone que o print mostra, já que excluir nem existe aqui) — mesma
> decisão de escopo do Quiz Início/Reavaliação: edição de quiz é pós-MVP
> (briefing, seção 00 e mapeamento P05), ocultar o CRUD e manter só a
> listagem/leitura do card acima.

**"Página de Fim":**

> ⚠️ **Não implementar nesta rodada — página inteira é pós-MVP.** Todo o
> bloco E–N abaixo (criar/duplicar/excluir aba, editar nome/link da aba,
> editar link do vídeo VSL, editar HTML da VSL, blocos "Títulos e textos" e
> "Botões da página", preview + "Salvar páginas de fim") é CRUD de edição
> de quiz, coberto pela mesma decisão do briefing (seção 00: *"Edição de
> quiz fica pós-MVP (arquitetura diferente)"*) e do mapeamento do P05
> (*"Página de Fim (edição fica pós-MVP...)"*). O grid abaixo documenta a
> estrutura completa vista nos prints **só como referência futura** — nada
> dele é construído nesta rodada. Nenhuma variação de leitura substitui
> esta região por enquanto: a aba "Página de Fim" não é exposta no nível 2
> (C) até que a edição de quiz entre em escopo.

```
┌─────────────────────────────────────────────────────────────┐
│ E — Título "Páginas de Fim" + botões "+ Nova aba"/"Duplicar"/  │
│     "Excluir"                                                  │
├─────────────────────────────────────────────────────────────┤
│ F — Sub-abas de página (Upsell/Downsell/Upsell-app/           │
│     Downsell-app) + faixa "Link da aba selecionada"             │
├─────────────────────────────────────────────────────────────┤
│ G — Bloco de aviso: links publicados (Upsell/Downsell)          │
├─────────────────────────────────────────────────────────────┤
│ H — Bloco "Configuração da aba": Nome da aba, Link da aba        │
├─────────────────────────────────────────────────────────────┤
│ I — Bloco "URL DO VÍDEO VSL" + ajuda                             │
├─────────────────────────────────────────────────────────────┤
│ J — Bloco "HTML DA VSL": textarea + Largura + Altura             │
├─────────────────────────────────────────────────────────────┤
│ K — Bloco "Títulos e textos": "+ Adicionar" + itens (Tipo,       │
│     excluir, textarea, Cor do texto, Tamanho, Peso,              │
│     Alinhamento)                                                 │
├─────────────────────────────────────────────────────────────┤
│ L — Bloco "Botões da página": "+ Adicionar" + itens (excluir,    │
│     Texto do botão, URL, Texto abaixo, Fundo, Texto, Borda,      │
│     Stroke, Raio, Delay, Classe VTurb, checkbox nova aba)         │
├─────────────────────────────────────────────────────────────┤
│ M — Bloco "COMO VAI APARECER PARA O USUÁRIO": botão "Salvar e    │
│     abrir preview real" + preview ao vivo renderizado             │
├─────────────────────────────────────────────────────────────┤
│ N — Botão rodapé fixo "💾 Salvar páginas de fim" (full width)    │ ← sticky
└─────────────────────────────────────────────────────────────┘
```

| Região | Componente(s) |
|---|---|
| E | `atoms/button` ×3 (direto) |
| F | `atoms/tabs` (direto) + faixa de texto |
| G | `atoms/card` (bloco de aviso, direto) |
| H, I | `atoms/input` (direto) |
| J | `atoms/input` (textarea, direto) + `stepper-input` ×2 (Largura/Altura) |
| K | `atoms/select` (Tipo) + `atoms/input` (textarea) + `color-picker-field` (Cor do texto) + `stepper-input` (Tamanho) + `atoms/select` (Peso/Alinhamento) |
| L | `atoms/input` (Texto do botão/URL/Texto abaixo/Classe) + `color-picker-field` ×3 (Fundo/Texto/Borda) + `stepper-input` ×3 (Stroke/Raio/Delay) + checkbox nativo (fora do design system hoje, sinalizado no Passo 00) |
| M | `atoms/button` + preview renderizado (sem componente novo — é output, não input) |
| N | `atoms/button` (variante full-width sticky) |

### B.2 — Sub-tab "Respostas de Avaliação" → Por Usuário / Por Pergunta / Relatórios

```
┌─────────────────────────────────────────────────────────────┐
│ O — NAV nível 2: "Por Usuário" | "Por Pergunta" | "Relatórios" │ ← sticky
└─────────────────────────────────────────────────────────────┘
```
`O` = `atoms/tabs` (direto).

**"Por Usuário":**

```
┌─────────────────────────────────────────────────────────────┐
│ P — SEARCH-INPUT + botão/dropdown "Filtros" + contador          │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ Q — LISTA DE RESPOSTAS (1 coluna)                               │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| P | Busca "por nome, e-mail, pergunta ou resposta", "Filtros", "Mostrando 999 de 999" | `search-input` + `filter-bar` |
| Q | Avatar, e-mail/nome, ícone de status (pendente/completo), badges de perfil, data/hora, botão "Ver respostas" | `entity-card` (usa `status-icon` para o ícone pendente/completo) |
| Modal | Badge de plano, nome/e-mail+avatar, fechar, 3 sub-abas ("Dados"/"Cargas"/"Respostas do Quiz") | `entity-edit-modal-shell` + `atoms/tabs` (interno) + `plan-badge` |
| Modal → Dados | Bloco CADASTRO (Nome/E-mail); PERFIL FÍSICO (Idade/Sexo/Peso/Altura/Categoria); ACESSO & GESTÃO — Plano (2 toggles: Liberar Trinca/Elite), Cargo (grid 2×2: Aluno/Suporte/Treinador/Administrador), Status/Acesso/Compra/Assinatura/Vencimento/Dias restantes | `atoms/input` (direto) + `toggle-button-group` (Plano, `columns=1`) + `toggle-button-group` (Cargo, `columns=2`, resolve item 28) |
| Modal → Dados | Bloco AVALIAÇÃO (Objetivo/Nível financeiro/Avaliação inicial/badge "Não visualizou"/Preferência/Lema); TREINOS (concluídos + badge frequência); REAVALIAÇÃO (status + link "Definir data") | `atoms/badge` (direto) + `status-icon` (badge de frequência) |
| Modal → Dados | Bloco "Alterar senha do aluno": texto, "Gerar senha temporária", "Copiar senha", campos Nova senha/Confirmar, "Alterar senha" | `atoms/input` + `atoms/button` (direto) |
| Modal footer | Botão fixo "Fechar" | parte do `entity-edit-modal-shell` |

**"Por Pergunta":**

```
┌─────────────────────────────────────────────────────────────┐
│ R — GRID DE MÉTRICAS (4 col): Total/Única/Múltipla/Texto livre │
├─────────────────────────────────────────────────────────────┤
│ S — SEARCH-INPUT + dropdown "Todos os tipos"                    │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ T — LISTA DE PERGUNTAS (drill-down)                              │
└─────────────────────────────────────────────────────────────┘
```
Ao clicar em uma pergunta de T, a região T é **substituída** (não empilhada)
pelo detalhe:
```
┌─────────────────────────────────────────────────────────────┐
│ T′ — botão voltar "←" + "Pergunta N" + "N respostas coletadas" │
├───────────────────────────────┬───────────────────────────────┤
│ U1 — Distribuição (donut)      │ U2 — Contagem por opção          │
├───────────────────────────────┴───────────────────────────────┤
│ V — SEARCH-INPUT + dropdown "Todos" + contador                  │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ W — LISTA EXPANSÍVEL DE RESPOSTAS POR OPÇÃO                     │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| R | Cards "Total de perguntas", "Única escolha", "Múltipla escolha", "Texto livre" | `stat-tile` ×4 |
| S | Busca "Buscar pergunta...", dropdown tipo | `search-input` + `atoms/select` |
| T | Número, texto, badge tipo colorido, contador de respondentes, seta de navegação | `drilldown-question-card` |
| U1 | Gráfico pizza/donut com leader lines + tooltip | `donut-chart-card` |
| U2 | Lista nome+valor+percentual+barra por opção | `progress-list-item` |
| V | Busca por usuário/resposta + dropdown + contador | `search-input` + `atoms/select` |
| W | Cartão colapsável (bolinha de cor, nome, badge "X aluno(s)", percentual, barra, chevron) | `entity-card` (variante compacta, `expandable`) |

**"Relatórios" (dentro de Avaliação):**

```
┌─────────────────────────────────────────────────────────────┐
│ X — NAV nível 3: "📊 Visão Geral" | "💬 Quiz Inicial" |         │ ← sticky
│     "🔄 Relatório da Avaliação"                                 │
└─────────────────────────────────────────────────────────────┘
```

*Visão Geral:*

| Região | Feature | Componente(s) |
|---|---|---|
| Y1 | Card intro "📊 Resumo completo do quiz" | `atoms/card` (direto) |
| Y2 | 8 KPI tiles: Iniciaram/Concluíram/Desistiram/Tempo médio/Respostas rastreadas/Responderam suplementos/Quiz completo no cadastro/Compras aprovadas | `stat-tile` ×8 |
| Y3 | Card "Pergunta que mais demora" (pergunta + tempo médio) | `stat-tile` (variante com `description`) |
| Y4 | Cards "Perfil financeiro", "Objetivos dos alunos", "Experiência declarada", "Planos dos usuários" (barras horizontais) | `bar-chart-card` ×4 |
| Y5 | Card "Uso de suplementos" — vazio | `empty-state` |
| Y6 | Card "Últimas respostas recebidas" (e-mail, contador, badge status, timestamp) | `entity-card` ×N |

*Quiz Inicial:*

| Região | Feature | Componente(s) |
|---|---|---|
| Z1 | Filtro por e-mail + botões "Tudo"/"7 dias"/"30 dias"/"90 dias"/"Personalizado" | `period-filter-bar` |
| Z2 | 5 cards: Iniciaram/Completaram/Desistiram/Taxa conclusão/Tempo médio | `stat-tile` ×5 |
| Z3 | Gráfico "📉 Onde as pessoas desistiram" (barras por pergunta) | `bar-chart-card` |
| Z4 | "Análise por Pergunta" — card por pergunta (badge tipo, "X responderam", "Y% chegaram", tempo médio, barra, chevron, alerta vermelho "⚠ N desistiram aqui") | `drilldown-question-card` (prop `alert`) |

*Relatório da Avaliação (reavaliação):*

| Região | Feature | Componente(s) |
|---|---|---|
| AA1 | Filtro de período + botão "🔄 Atualizar" | `period-filter-bar` (prop `onRefresh`) |
| AA2 | Estado vazio central "Nenhuma resposta de reavaliação ainda..." | `empty-state` |
| AA3 | 4 cards zerados: Reavaliações/Alunos avaliados/Respostas totais/Média por aluno | `stat-tile` ×4 |
| AA4 | Contador "👥 0 reavaliação(ões) no filtro" | texto simples |
| AA5 | Card de pergunta expansível com 2 sub-abas ("Estatísticas"/"👥 Respostas individuais (0)") | `drilldown-question-card` + `atoms/tabs` (interno) |
| AA5 | Dentro de "Estatísticas": 3 mini-cards (Responderam/Taxa chegada/Respostas) + "Nenhuma resposta registrada" | `stat-tile` ×3 + `empty-state` |

**Densidade/ordem de leitura geral de P05:** A/B sempre sticky (identidade
da página + troca de sub-área nível 1). Dentro de cada sub-tab, a
nav de nível 2/3 (C/O/X) também é sticky — usuário troca de sub-view sem
perder o header. Conteúdo (D, Q, T/T′, Y–AA) é a região de maior prioridade
de scroll. No drill-down "Por Pergunta", V é sticky porque filtra W, que é a
lista mais longa da tela.

**Estados (aplicam-se a toda a página, por sub-view):**
- Vazio: `empty-state` explícito e confirmado em print para "Uso de
  suplementos" (Y5) e "Relatório da Avaliação" (AA2); implícito para D
  (nenhuma pergunta cadastrada) e Q/T (nenhuma resposta encontrada).
- Carregando: `skeleton` em todos os `stat-tile` (Y2, Z2, AA3), nos cards de
  gráfico (U1, Y4, Z3) e nas listas (D, Q, T, W) — a nav (A/B/C/O/X) nunca
  entra em skeleton, é renderizada de imediato a partir da config estática
  de abas.
- Escopo (nesta rodada, todas as roles): "Quiz Início"/"Quiz Reavaliação"
  (D) e "Páginas Especiais" (D) não têm ícones editar/excluir — CRUD de
  quiz é pós-MVP, não uma variação de role (ver disclaimers acima); aba
  "Página de Fim" inteira (E–N) fica oculta em `C` pelo mesmo motivo. Isso
  é distinto do estado "role sem permissão de edição" abaixo, que só se
  aplica às regiões que já entram no MVP como editáveis.
- Role sem permissão de edição: no modal de usuário (Por Usuário), bloco
  "Alterar senha do aluno" some inteiro, e os `toggle-button-group` de
  Plano/Cargo viram badges estáticos (sem interação).

---

## P06 — Relatórios

*(Prints: `reports/19.48.28` a `19.49.30`.)*

**Breakpoint mínimo assumido:** `lg` (≥1024px) — grids de 2 e 4 colunas de
métricas/gráficos exigem essa largura.

```
┌─────────────────────────────────────────────────────────────┐
│ A — HEADER: "Relatórios" + "Análise completa do sistema"       │
├─────────────────────────────────────────────────────────────┤
│ B — NAV: "Visão Geral" | "Usuários" | "Avaliações" |            │ ← sticky
│     "Sugestões"                                                 │
└─────────────────────────────────────────────────────────────┘
```
`A` = `entity-list-header` (sem contador/ações). `B` = `atoms/tabs`.

**Aba "Visão Geral":**

```
┌─────────────────────────────────────────────────────────────┐
│ C — GRID DE MÉTRICAS (3×2): Total alunos/Avaliação média/       │
│     Freq. média/Sugestões/Elite/Trinca                          │
├───────────────────────────────┬───────────────────────────────┤
│ D1 — Card "Objetivos" (barras) │ D2 — Card "Distribuição de      │
│                                 │      Sexo" (donut)              │
└───────────────────────────────┴───────────────────────────────┘
```

| Região | Componente(s) |
|---|---|
| C | `stat-tile` ×6 |
| D1 | `bar-chart-card` |
| D2 | `donut-chart-card` |

**Aba "Usuários":**

```
┌─────────────────────────────────────────────────────────────┐
│ E — GRID DE MÉTRICAS (4 col): Homens/Mulheres/Idade média/      │
│     Freq. média                                                 │
├───────────────────────────────┬───────────────────────────────┤
│ F1 — "Faixas etárias" (barras  │ F2 — "Categorias de Alunos"     │
│      verticais + tooltip)      │      (lista label+barra+valor)  │
└───────────────────────────────┴───────────────────────────────┘
```

| Região | Componente(s) |
|---|---|
| E | `stat-tile` ×4 |
| F1 | `bar-chart-card` (com tooltip on-hover) |
| F2 | `progress-list-item` ×N |

**Aba "Avaliações":**

```
┌─────────────────────────────────────────────────────────────┐
│ G — GRID DE MÉTRICAS (4 col): Total avaliações/Média geral/     │
│     Feedbacks negativos/Positivos                               │
├───────────────────────────────┬───────────────────────────────┤
│ H1 — "Distribuição de notas"   │ H2 — "Feedbacks negativos"      │
│      (barras 1★–10★)           │      (vazio)                    │
├───────────────────────────────┴───────────────────────────────┤
│ I — "Notas por treino" (lista treino → nota + contagem)         │
└─────────────────────────────────────────────────────────────┘
```

| Região | Componente(s) |
|---|---|
| G | `stat-tile` ×4 |
| H1 | `bar-chart-card` |
| H2 | `empty-state` ("Nenhum feedback negativo") |
| I | `entity-card` ×N (compacto) |

**Aba "Sugestões":**

```
┌─────────────────────────────────────────────────────────────┐
│ J — GRID DE MÉTRICAS (3 col): Total/Novas/Implementadas         │
├─────────────────────────────────────────────────────────────┤
│ K — LISTA DE SUGESTÕES (1 coluna)                                │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| J | `stat-tile` ×3 |
| K | Nome+e-mail do autor, badge de status, **select editável** de classificação (nova/revisada/implementada), corpo da sugestão | `entity-card` + `atoms/select` (direto, editável inline) |

**Densidade/ordem de leitura:** A → B (sticky, troca de aba) → grid de
métricas da aba ativa (maior densidade de scan, topo) → cards de
gráfico/lista (scroll principal). Nenhuma região é sticky abaixo de B.

**Estados:**
- Vazio: H2 confirmado em print ("Nenhum feedback negativo"); D1/D2/F1/F2/I/K
  usam `empty-state` quando não há dados no recorte atual.
- Carregando: `skeleton` em todos os `stat-tile` (C/E/G/J) e cards de
  gráfico/lista de cada aba — troca de aba em B dispara novo skeleton
  apenas na região de conteúdo da aba, não no header A/B.
- Role sem permissão de edição: em K, o select de classificação (nova/
  revisada/implementada) vira badge estático (não editável); demais abas
  são 100% leitura em qualquer role.

---

## P07 — Conquistas

*(Prints: `conquistas/20.04.56`, `20.05.01`.)*

**Breakpoint mínimo assumido:** `lg` (≥1024px) — grid de conquistas em 2
colunas; abaixo colapsa para 1.

```
┌─────────────────────────────────────────────────────────────┐
│ A — ENTITY-LIST-HEADER ("Conquistas" + subtítulo, botão        │
│     "+ Nova conquista")                                         │
├─────────────────────────────────────────────────────────────┤
│ B — CARD INFORMATIVO FIXO (ícone coroa: "Conquistas             │
│     disponíveis apenas para o Elite")                            │
├─────────────────────────────────────────────────────────────┤
│ C — CARD "Modelos Elite" (badge coroa, texto, botão "Adicionar   │
│     modelos" — sem ação real, não implementar)                   │
├─────────────────────────────────────────────────────────────┤
│ D — FORM INLINE "Nova conquista" (com link "Fechar")             │
├─────────────────────────────────────────────────────────────┤
│ E — GRID DE CONQUISTAS EXISTENTES (2 col)                        │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| A | Título "Conquistas" + subtítulo + "+ Nova conquista" | `entity-list-header` |
| B | Card informativo (ícone coroa) | `atoms/card` (direto) |
| C | Card "Modelos Elite" premium, botão "Adicionar modelos" (não implementar — decisão do Passo 00) | `atoms/card` + `atoms/badge` (coroa) + `atoms/button` (desabilitado/placeholder) |
| D | Nome, descrição motivacional, badge de plano, tipo de métrica, valor inicial/alvo, XP concedido, "Salvar conquista" | `atoms/input`/`atoms/select` (direto) — inline, não é modal |
| E | Ícone coroa, título, badge "+N XP", descrição, métrica+"Meta: N", editar/excluir | `entity-card` ×N |

**Densidade/ordem de leitura:** A → B (aviso permanente, baixa prioridade
depois da 1ª leitura) → C (card promocional, secundário) → D (form,
condicional — só relevante quando aberto) → E (grid principal, maior
prioridade de scroll). Nada é sticky (fluxo linear de topo a baixo).

**Estados:**
- Vazio: E usa `empty-state` quando não há conquistas cadastradas ainda.
- Carregando: `skeleton` nos cards de E; D não entra em skeleton (form
  estático, sem dados remotos a esperar).
- Role sem permissão de edição: A perde "+ Nova conquista"; D
  (form inline) não é renderizado; E perde ícones editar/excluir.

---

## P08 — Banners

*(Prints: `banners/20.16.53`, `20.16.58`, `20.17.01`.)*

**Breakpoint mínimo assumido:** `md` (≥768px) — grid de cards de banner em
2 colunas; abaixo colapsa para 1.

```
┌─────────────────────────────────────────────────────────────┐
│ A — ENTITY-LIST-HEADER ("Banners" + texto explicativo,          │
│     botão "+ Adicionar")                                         │
├───────────────────────────────┬───────────────────────────────┤
│ B — GRID DE BANNERS (2 col, wrap)                                │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| A | Header com texto explicativo (giro automático 10s, link opcional) + "+ Adicionar" | `entity-list-header` |
| B | Imagem/artwork, título, URL destino, badge plano (Elite/Trinca), badge status (Ativo/Inativo), editar/excluir | `entity-card` (usa `plan-badge`) |

**Modal "Editar banner":**

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: fechar (X)                                              │ ← sticky
├─────────────────────────────────────────────────────────────┤
│ C — Imagem do banner: preview + "Escolher imagem" + URL         │
├─────────────────────────────────────────────────────────────┤
│ D — Título interno; Link ao clicar (opcional)                   │
├─────────────────────────────────────────────────────────────┤
│ E — "Aparece para" (select); Ordem (numérico); Status (select)  │
├─────────────────────────────────────────────────────────────┤
│ FOOTER: "💾 Salvar banner"                                       │ ← sticky
└─────────────────────────────────────────────────────────────┘
```

| Região | Componente(s) |
|---|---|
| Header/Footer | `entity-edit-modal-shell` |
| C | `dropzone-button` (Escolher imagem) + `atoms/input` (URL) |
| D | `atoms/input` (direto) |
| E | `atoms/select` ×2 (direto) + `stepper-input` (Ordem) |

**Densidade/ordem de leitura:** A → B (grid principal, único conteúdo da
página). Modal: header sticky, corpo rola, footer sticky.

**Estados:**
- Vazio: B usa `empty-state` quando não há banners cadastrados para nenhum
  plano.
- Carregando: `skeleton` nos cards de B (incluindo a imagem/artwork).
- Role sem permissão de edição: A perde "+ Adicionar"; B perde
  editar/excluir; regra de negócio (não permitir 2 imagens ativas no mesmo
  plano+ordem) só é validável no modal, que não é exposto nesta role.

---

## P09 — Regras

*(Prints: `classification/20.25.09` a `20.25.30`.)*

**Breakpoint mínimo assumido:** `lg` (≥1024px) — aba "Testador" tem 4
campos de input manual lado a lado + tabela de "Campos disponíveis" com 3
colunas largas.

```
┌─────────────────────────────────────────────────────────────┐
│ A — ENTITY-LIST-HEADER ("Regras", contador "5 regras           │
│     cadastradas · 5 ativas", botão "+ Nova Regra")               │
├─────────────────────────────────────────────────────────────┤
│ B — CARD EXPLICATIVO "Como funciona o sistema de regras"        │
│     (3 itens numerados)                                          │
├─────────────────────────────────────────────────────────────┤
│ C — NAV: "☰ Regras" (badge 5) | "🧪 Testador" |                 │ ← sticky
│     "📖 Campos disponíveis"                                       │
└─────────────────────────────────────────────────────────────┘
```

`A` = `entity-list-header`. `B` = `atoms/card` (direto). `C` = `atoms/tabs`
+ `atoms/badge`.

**Aba "Regras":**

| Região | Feature | Componente(s) |
|---|---|---|
| D | Seta de prioridade, número, nome, badge "⚠ OVERRIDE" (borda vermelha), condição `campo = operador = "valor"`, seta de resultado + badge de nível, descrição, toggle ativo/inativo, editar/excluir | `override-rule-card` |

**Aba "Testador":**

```
┌─────────────────────────────────────────────────────────────┐
│ E — "PERFIS DE TESTE RÁPIDO" (grid de botões preset)             │
├─────────────────────────────────────────────────────────────┤
│ F — "OU PREENCHA MANUALMENTE" (grid 4 col × 2 linhas de inputs) │
├─────────────────────────────────────────────────────────────┤
│ G — Botão "Testar Classificação"                                 │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| E | 5 botões preset ("Iniciante 25 anos", "Sênior 60 (deve forçar iniciante)", "Com dor/lesão (deve forçar iniciante)", etc.) | `quick-profile-button-grid` |
| F | 8 campos (Gênero, Idade, Experiência, Treinando?, Objetivo, Urgência, Gasto mensal, Dor/Saúde) | `atoms/input` ×8 (direto) |
| G | Botão "Testar Classificação" | `atoms/button` (direto) |

**Aba "Campos disponíveis":**

| Região | Feature | Componente(s) |
|---|---|---|
| H | Título + texto de ajuda | texto simples |
| I | Tabela CAMPO / PERGUNTA NO QUIZ / VALORES ACEITOS (8 linhas) | `field-reference-table` |

**Densidade/ordem de leitura:** A → B (explicação, alta prioridade na
primeira visita, baixa depois) → C (sticky, troca de aba). Dentro de
"Regras": D é lista ordenada por prioridade (ordem visual = ordem de
avaliação do sistema, portanto crítica de preservar). Dentro de "Testador":
E (atalho) → F (manual, alternativa a E) → G (ação). Dentro de "Campos
disponíveis": I é read-only, referência.

**Estados:**
- Vazio: D usa `empty-state` se não houver nenhuma regra cadastrada
  (contrasta com o card explicativo B, que permanece visível mesmo vazio).
- Carregando: `skeleton` nos cards de D e na tabela I.
- Role sem permissão de edição: A perde "+ Nova Regra"; D perde toggle
  ativo/inativo e ícones editar/excluir (setas de prioridade também somem,
  já que reordenar é edição); "Testador" (E/F/G) permanece 100% acessível
  em qualquer role (é uma ferramenta de simulação, não uma edição de
  dados); "Campos disponíveis" (I) é sempre leitura.

---

## P10 — Liberar usuário

*(Print: `regras/20.55.35`.)*

**Breakpoint mínimo assumido:** `md` (≥768px) — layout de 2 colunas lado a
lado; abaixo colapsa para colunas empilhadas (Criar usuário acima, Editar
usuário abaixo).

```
┌─────────────────────────────────────────────────────────────┐
│ A — HEADER "Liberar e editar usuário" + subtítulo               │
├─────────────────────────────────────────────────────────────┤
│ B — CARD INFORMATIVO (ícone escudo): regra da senha padrão      │
│     12345 + fluxo de dias restantes Elite                       │
├───────────────────────────────┬───────────────────────────────┤
│ C — COLUNA "Criar usuário"     │ D — COLUNA "Editar usuário"     │
│     (subtítulo, e-mail, plano, │     (subtítulo, busca por        │
│     botão "Criar e liberar")   │     e-mail + lupa)               │
└───────────────────────────────┴───────────────────────────────┘
```

| Região | Componente(s) |
|---|---|
| A | `entity-list-header` (sem contador/ações — só título+subtítulo) |
| B | `atoms/card` (direto) |
| C+D | `two-column-form-layout` |
| C (conteúdo) | `atoms/input` (E-mail do aluno) + `atoms/select` (Plano) + `atoms/button` ("👤+ Criar e liberar") |
| D (conteúdo) | `search-input` (busca por e-mail + lupa) |

**Estado adicional de D** (não capturado no print, sinalizado no Passo 00
como "aparece só após busca"): ao encontrar o aluno, D expande para exibir
os mesmos campos de edição de plano/dias restantes Elite/protocolo já
descritos no modal de usuário de P05 (Plano via `toggle-button-group`,
protocolo via `plan-badge`/badge de vínculo) — reaproveitado, não um layout
novo.

**Densidade/ordem de leitura:** A → B (aviso operacional importante, lido
antes de qualquer ação) → C/D lado a lado, mesma prioridade (são fluxos
independentes: criar vs. editar). Nenhuma região é sticky — página curta,
sem necessidade.

**Estados:**
- Vazio: D antes da busca é o próprio estado "vazio" da coluna (só o campo
  de busca, sem resultado) — não é um `empty-state` centralizado, é o
  estado inicial padrão do formulário.
- Vazio (busca sem match): D mostra `empty-state` ("nenhum aluno
  encontrado com este e-mail") no lugar da expansão de resultado.
- Carregando: `skeleton` no botão "Criar e liberar" (C) durante submit; em
  D, `skeleton` no bloco expandido enquanto os dados do aluno carregam após
  a busca.
- Role sem permissão de edição: página inteira (C e D) não é exposta —
  criação/edição manual de acesso é ação sensível, reservada a quem tem
  permissão de edição (não há variante read-only útil aqui, diferente das
  demais páginas).

---

## P11 — Configurações

*(Prints: `settings/20.54.22`, `20.54.29`.)*

**Breakpoint mínimo assumido:** `md` (≥768px) — seções em coluna única,
alguns campos em par (Validade Trinca/Elite) que colapsam para 1 coluna
abaixo disso.

```
┌─────────────────────────────────────────────────────────────┐
│ A — HEADER "Configurações" + subtítulo                          │
├─────────────────────────────────────────────────────────────┤
│ B — SEÇÃO "Informações do App" (Nome do app)                     │
├─────────────────────────────────────────────────────────────┤
│ C — SEÇÃO "Funil, produtos e Elite" (7 campos, 2 numéricos      │
│     lado a lado)                                                 │
├─────────────────────────────────────────────────────────────┤
│ D — SEÇÃO "Suporte" (3 campos + botão "💾 Salvar configurações") │
├─────────────────────────────────────────────────────────────┤
│ E — SEÇÃO "Prazo de Reavaliação" (campo + Aplicar + status)      │
└─────────────────────────────────────────────────────────────┘
```

| Região | Feature | Componente(s) |
|---|---|---|
| A | Título "Configurações" + subtítulo | `entity-list-header` (sem contador/ações) |
| B | "Nome do app" | `atoms/input` (direto) |
| C | IDs de produto Treino Trinca/Trinca Elite, Link de upgrade, Validade Trinca/Elite (dias), Links de renovação Trinca/Elite | `atoms/input` (direto) + `stepper-input` ×2 (Validade Trinca/Elite) |
| D | Link de suporte, WhatsApp, E-mail de suporte, botão "💾 Salvar configurações" | `atoms/input` (direto) + `atoms/button` |
| E | "Prazo global de reavaliação (dias)" + ajuda + botão "Aplicar" + status "Último prazo aplicado em..." | `apply-value-card` |

**Densidade/ordem de leitura:** A → B → C → D → E, todas em fluxo linear de
topo a baixo, sem sticky — é uma página de formulário longo, não uma lista
com filtro a preservar.

**Estados:**
- Vazio: não se aplica — todos os campos vêm com valor default/atual do
  sistema, nunca em branco sem contexto.
- Carregando: `skeleton` em cada seção (B–E) até os valores atuais
  carregarem; botão "Salvar configurações" fica desabilitado até isso
  resolver.
- Role sem permissão de edição: B, C, D viram somente-leitura (campos
  desabilitados, sem botão "Salvar configurações"); E perde o botão
  "Aplicar" mas mantém o texto de status "Último prazo global aplicado
  em..." visível (é informação, não ação).

---

## Cobertura — features e componentes (checagem de fechamento)

**Features:** todas as features listadas na Parte 1 do Passo 00 para P01–P11
foram alocadas a pelo menos uma região acima, incluindo os itens sinalizados
como "não observados no print" (estados vazio/loading de P04, campos
pós-busca de P10) — tratados como estados explícitos em vez de regiões
estáticas, já que só existem condicionalmente.

**Componentes (Parte 2, 28 linhas → 27 componentes distintos após a fusão
item 14/28):** todos usados em pelo menos uma região —

| Componente | Página(s) onde aparece acima |
|---|---|
| `stat-tile` | P01, P02, P03, P05, P06 |
| `progress-list-item` | P05, P06 |
| `donut-chart-card` | P01, P05, P06 |
| `bar-chart-card` | P01, P05, P06 |
| `entity-card` | P01, P03, P04, P05, P06, P07, P08 |
| `entity-list-header` | P02, P03, P04, P05, P06, P07, P08, P09, P10, P11 |
| `category-pill-filter` | P04 |
| `search-input` | P02, P03, P04, P05, P10 |
| `entity-edit-modal-shell` | P03, P04, P05, P08 |
| `wizard-tabs` | P03 |
| `reorderable-list-item` | P03 |
| `video-link-field` | P03, P04 |
| `dropzone-button` | P03, P04, P08 |
| `toggle-button-group` (inclui item 28 via prop `columns`) | P05 |
| `stepper-input` | P03, P05, P08, P11 |
| `color-picker-field` | P05 |
| `linked-entity-search-list` | P03 |
| `status-icon` | P03, P05 |
| `plan-badge` | P03, P05, P08, P10 |
| `override-rule-card` | P09 |
| `two-column-form-layout` | P10 |
| `apply-value-card` | P02, P11 |
| `field-reference-table` | P09 |
| `quick-profile-button-grid` | P09 |
| `empty-state` | P01, P02, P03, P04, P05, P06, P07, P08, P09, P10 |
| `period-filter-bar` | P05 |
| `drilldown-question-card` | P05 |

Nenhum componente da Parte 2 fica sem uso; nenhuma feature da Parte 1 fica
sem região.
