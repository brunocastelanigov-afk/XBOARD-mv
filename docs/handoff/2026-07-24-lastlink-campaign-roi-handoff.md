# Handoff: Atribuição de ROI por Campanha (Lastlink) — 2026-07-24

> Documento self-contained para qualquer agente/humano continuar este trabalho sem precisar reconstruir contexto a partir do histórico da sessão. Escrito para ser consumido por um agente de IA primeiro, humano depois — factual, sem narrativa, com paths/comandos exatos.

## 0. TL;DR

- **O quê**: Vendas Lastlink (front + upsell) passam a virar eventos em `funnel_events` (tabela já existente), permitindo calcular ROI real por campanha no dashboard.
- **Estado**: Código completo, testado (unitário + integração real contra produção), QA **PASS** nas duas stories, RPC de produção **aplicada e validada**. **Nada foi deployado** (nem worker, nem dashboard) e **nada foi commitado** em nenhum dos dois repos.
- **Próxima ação de maior valor**: revisar os diffs (`git diff`) nos dois repos, decidir se commita, e então rodar o runbook de deploy (seção 11).
- **Bloqueio original (Supabase MCP apontando pro projeto errado) já resolvido** — ver seção 4.

## 1. Mapa do sistema

Três repositórios/diretórios envolvidos, workspace raiz **não é um repositório git** (`/Users/brunogovas/Projects/Melhor-Versao-Projetos` tem `.git` apenas nos subdiretórios abaixo):

| Diretório | Repo git? | Papel |
|---|---|---|
| `desafio-treino-trinca-replica/` | Sim (`main`, 2 commits, não relacionados a esta feature) | Funil React (quiz) que gera o `lead_id` e redireciona pro checkout Lastlink |
| `desafio-treino-trinca-replica/worker/` | Mesmo repo do funil, subpasta | Cloudflare Worker `desafio-treino-trinca-worker` — recebe telemetria do funil E (agora) webhooks da Lastlink |
| `dashboard/` | Sim (`main`, à frente de `origin`) | Dashboard React que consome as RPCs do Supabase, incluindo a nova página de ROI |

**Banco de dados**: projeto Supabase real **`zcaypxqrteoedzbdmagm`** (`https://zcaypxqrteoedzbdmagm.supabase.co`) — é o mesmo projeto usado pelo worker (`worker/wrangler.toml`/`worker/.dev.vars`) e pelo dashboard (`dashboard/.env`). Tabela única relevante: `public.funnel_events` (append-only, ~3300 linhas reais em 2026-07-24, RLS habilitada).

**Cloudflare**: projeto Worker já em produção, nome `desafio-treino-trinca-worker` (ver `worker/wrangler.toml:1`). Nenhum Worker novo foi criado.

## 2. Fluxo de dados (end-to-end)

```
Funil (VslStep.tsx)
  → buildTaggedCheckoutUrl() adiciona utm_source/medium/campaign/term/content/src/sck + vtid=<leadId>
  → window.location.href = URL taggeada da Lastlink

Lastlink (venda front OU upsell)
  → POST {worker}/api/lastlink-webhook?token=<LASTLINK_WEBHOOK_TOKEN>
  → worker resolve atribuição (Vtid p/ front, e-mail p/ upsell) e grava em funnel_events
  → event_type: purchase | purchase_upsell | purchase_refunded | purchase_chargeback

Dashboard (campaign-roi.tsx)
  → supabase.rpc("rpc_campaign_roi", {p_funnel_id, p_country, p_funnel_variant, p_date_from, p_date_to})
  → agrega receita líquida por utm_source/utm_campaign/utm_medium, exclui metadata.is_test=true
```

## 3. Contrato de dados

### 3.1 `funnel_events` — linhas gravadas por esta feature

Colunas reais da tabela (sem coluna nova adicionada): `event_id (uuid pk)`, `funnel_id`, `country`, `funnel_variant (nullable)`, `event_type`, `step_name`, `step_number`, `lead_id`, `metadata (jsonb)`, `event_timestamp`, `ingested_at`.

**`event_type = "purchase"` ou `"purchase_upsell"`** — `metadata`:
```json
{
  "source": "lastlink",
  "lastlink_event_id": "<Data.Id do webhook, para idempotência>",
  "payment_id": "<Data.Purchase.PaymentId>",
  "is_upsell": false,
  "is_test": false,
  "attribution_status": "matched | unmatched",
  "product_id": "...", "product_name": "...",
  "price_cents": 19700,
  "payment_method": "credit_card",
  "buyer_email": "normalizado (lowercase+trim)",
  "utm_source": "...", "utm_medium": "...", "utm_campaign": "...", "utm_content": "...", "utm_term": "..."
}
```

**`event_type = "purchase_refunded"` ou `"purchase_chargeback"`** (linha NOVA, nunca sobrescreve a compra original) — mesmo shape acima, mais `original_event_id` (event_id da compra original), sem `product_id`/`product_name`/`payment_method`/`buyer_email`.

**Valores-sentinela quando `attribution_status = "unmatched"`**: `lead_id = "lead_unmatched_" + lastlink_event_id`, `funnel_id = "unmatched"`, `country = "BR"` (aproximação, Lastlink é majoritariamente BR), `funnel_variant = null`. **Nunca descartado** — sempre grava, mesmo sem atribuição resolvida.

### 3.2 `rpc_campaign_roi` (Postgres function, já em produção)

```sql
rpc_campaign_roi(p_funnel_id text, p_country text, p_funnel_variant text, p_date_from date, p_date_to date)
returns table (
  utm_source text, utm_campaign text, utm_medium text,
  front_revenue_cents bigint, upsell_revenue_cents bigint, total_revenue_cents bigint,  -- já líquidos (pós-estorno)
  reversed_revenue_cents bigint,  -- total estornado, separado, p/ transparência
  front_orders bigint, upsell_orders bigint,
  unmatched_revenue_cents bigint
)
```
Exclui por padrão `metadata->>'is_test' = 'true'`. `security definer`, `search_path = public` fixo, `grant execute` para `anon`/`authenticated`. Fonte: `dashboard/supabase/migrations/20260724120000_rpc_campaign_roi.sql`.

### 3.3 TypeScript (`dashboard/src/lib/dashboard-types.ts`)

```typescript
export interface CampaignRoiRow {
  utm_source: NullableString
  utm_campaign: NullableString
  utm_medium: NullableString
  front_revenue_cents: number
  upsell_revenue_cents: number
  total_revenue_cents: number
  reversed_revenue_cents: number
  front_orders: number
  upsell_orders: number
  unmatched_revenue_cents: number
}
```
**Nota**: PostgREST serializa `bigint` como string às vezes; todo consumo em `dashboard/src/pages/campaign-roi.tsx` já passa por `Number(...)` antes de somar/formatar (ver `sum()` em `campaign-roi.tsx` e `formatNumber`/`formatCurrency` em `format.ts`) — não assumir que os campos numéricos chegam como `number` puro do wire.

## 4. Decisões de design (por quê, não só o quê)

1. **`vtid` (não `src`/`sck`) carrega o `lead_id`** — Lastlink ecoa `Vtid` no webhook mas o funil não usava esse campo pra nada; `src`/`sck` já são usados para atribuição real de campanha, reutilizá-los colidiria semanticamente.
2. **`Vtid` só é confiável na venda front** — upsell/order bump acontece numa página/botão controlado pela própria Lastlink, fora do alcance do clique do funil. Por isso o upsell usa um **crosswalk por e-mail** (`Data.Buyer.Email`, normalizado) contra a venda front já gravada, em vez de `Vtid`.
3. **Refund/chargeback = linha nova, nunca `PATCH`** — preserva o histórico completo; a `rpc_campaign_roi` calcula receita líquida subtraindo essas linhas na agregação, não sobrescrevendo a compra original.
4. **Idempotência sem migration** — `GET` por `metadata->>lastlink_event_id` antes de cada `POST`. Aceita uma janela de corrida teórica (dois webhooks idênticos simultâneos) — **risco aceito conscientemente**, documentado, não é bug. Mitigação futura opcional: índice único funcional em `metadata->>'lastlink_event_id'`.
5. **`is_test` como convenção de dado de teste** — qualquer linha sintética/de teste deve levar `metadata.is_test=true` (via `IsTest:true` no envelope Lastlink, ou manualmente para `checkout_start`). A RPC já filtra isso por padrão — é assim que a auditoria desta sessão conseguiu gerar/limpar dados reais em produção sem afetar métricas reais.
6. **Sem tabela nova** — tudo em `funnel_events` já existente, evitando join/schema novo.

## 5. Manifesto de arquivos

### `desafio-treino-trinca-replica/` (funil)
| Arquivo | Status | Propósito |
|---|---|---|
| `src/lib/funnelTracker.ts` | modificado | `buildTaggedCheckoutUrl()` — novo export |
| `src/components/VslStep.tsx` | modificado | usa a URL taggeada em vez de `step.checkoutHref` cru |
| `scripts/verify-checkout-tagging.mjs` | novo | verificação standalone (esbuild + stubs) de `buildTaggedCheckoutUrl`, sem depender do player VTurb |
| `qa/tests/checkout-url-tagging.spec.ts` | novo | e2e Playwright real — **bloqueado neste ambiente** (ver seção 8) |

### `desafio-treino-trinca-replica/worker/`
| Arquivo | Status | Propósito |
|---|---|---|
| `src/lastlink.js` | novo | parsing do envelope, token em tempo constante, resolução de atribuição (front/upsell), builders de `purchase`/`reversal` |
| `src/index.js` | modificado | rota `POST /api/lastlink-webhook` |
| `src/supabase-client.js` | modificado | 4 novas funções de leitura: `findLastlinkEventById`, `findCheckoutStartByLeadId`, `findFrontPurchaseByEmail`, `findPurchaseByPaymentId` |
| `test/lastlink.test.js` | novo | 11 testes `node --test`, fetch mockado |
| `test/manual/lastlink-campaign-audit.mjs` | novo | gera 10 campanhas sintéticas, envia contra worker local (que escreve no Supabase REAL) |
| `test/manual/verify-campaign-audit.mjs` | novo | busca as linhas gravadas, replica em JS a lógica da RPC, imprime tabela de conferência |
| `test/manual/cleanup-test-data.mjs` | novo | dry-run por padrão; `--confirm` apaga por `lead_id`/`lastlink_event_id` prefix |
| `.dev.vars` / `.dev.vars.example` | modificado | `LASTLINK_WEBHOOK_TOKEN` (só local; produção pendente) |
| `README.md` | novo | runbook de deploy |

### `dashboard/`
| Arquivo | Status | Propósito |
|---|---|---|
| `src/lib/dashboard-types.ts` | modificado | `CampaignRoiRow` |
| `src/lib/dashboard-queries.ts` | modificado | `fetchCampaignRoi()` |
| `src/lib/format.ts` | modificado | `formatCurrency()` |
| `src/pages/campaign-roi.tsx` | novo | página `/roi-campanhas` |
| `src/main.tsx` | modificado | rota `roi-campanhas` |
| `src/components/composites/app-sidebar.tsx` | modificado | item de menu "ROI de Campanhas" |
| `playwright.config.ts` | novo | config Playwright (porta 5183, evita colidir com o funil na 5173) |
| `tests/campaign-roi.spec.ts` | novo | 2 testes, auth + RPCs mockadas via `page.route` |
| `package.json`/`package-lock.json` | modificado | `@playwright/test` devDependency |
| `.gitignore` | modificado | `test-results`, `playwright-report` |
| `supabase/migrations/20260724120000_rpc_campaign_roi.sql` | novo | **já aplicada em produção** |
| `docs/stories/1.1...story.md`, `1.2...story.md` | modificado | Status → "Ready for Review", Dev Agent Record + QA Results preenchidos |
| `docs/qa/gates/1.1...yml`, `1.2...yml` | novo | gate PASS |
| `docs/qa/audit-1.1-1.2-2026-07-24.md` | novo | auditoria completa (leitura recomendada antes de deploy) |

### Fora dos repos git (workspace root)
| Arquivo | Status | Propósito |
|---|---|---|
| `/Users/brunogovas/Projects/Melhor-Versao-Projetos/.mcp.json` | novo, **não versionado** (workspace não é repo git) | Servidor MCP `Supabase_Dashboard` escopado a este projeto, apontando pro `project_ref` correto |

## 6. Estado da infraestrutura (checklist)

- [x] `rpc_campaign_roi` criada em produção (`zcaypxqrteoedzbdmagm`)
- [x] `grant execute` para `anon`/`authenticated` aplicado
- [x] `search_path` fixo (advisory `function_search_path_mutable` resolvido)
- [x] `LASTLINK_WEBHOOK_TOKEN` configurado localmente (`worker/.dev.vars`)
- [ ] `LASTLINK_WEBHOOK_TOKEN` configurado em **produção** (`wrangler secret put`) — **pendente**
- [ ] Worker deployado (`wrangler deploy`) — **pendente, precisa aprovação**
- [ ] Funil deployado com a URL taggeada — **pendente, precisa aprovação** (deploy do funil é via branch `deploy`, ver `.github/workflows` do repo)
- [ ] Dashboard deployado (`git push` → Vercel) — **pendente, precisa aprovação**
- [ ] URL do webhook cadastrada em cada produto Lastlink (front + upsells) — **pendente, só possível depois do worker estar deployado**
- [x] MCP `Supabase_Dashboard` autorizado e funcional nesta sessão (não sei se persiste para outras sessões/máquinas — ver seção 9)

## 7. Comandos de referência

**Seguros, locais, sem tocar produção:**
```bash
# worker — testes unitários offline
cd desafio-treino-trinca-replica/worker && npm test

# dashboard — lint, build, testes e2e mockados
cd dashboard && npm run lint && npm run build && npx playwright test

# funil — typecheck
cd desafio-treino-trinca-replica && npx tsc -b --noEmit

# funil — verificação standalone do tagging (sem VTurb)
cd desafio-treino-trinca-replica && node scripts/verify-checkout-tagging.mjs
```

**Tocam produção (dados reais, uso já pré-autorizado nesta sessão pelo stakeholder — reconfirmar se for outra pessoa/sessão):**
```bash
# roda o worker local (usa .dev.vars → escreve no Supabase REAL)
cd desafio-treino-trinca-replica/worker && npx wrangler dev --port 8787

# gera + envia 10 campanhas sintéticas contra o worker local acima
node test/manual/lastlink-campaign-audit.mjs

# verifica as linhas gravadas + replica a lógica da RPC em JS
node test/manual/verify-campaign-audit.mjs

# limpeza (dry-run por padrão!)
node test/manual/cleanup-test-data.mjs           # só lista
node test/manual/cleanup-test-data.mjs --confirm # apaga de fato
```

**Via MCP `Supabase_Dashboard` (requer autorização ativa nesta sessão — ver seção 9):**
```
mcp__Supabase_Dashboard__get_project_url        # sempre confirmar antes de qualquer escrita — deve retornar zcaypxqrteoedzbdmagm
mcp__Supabase_Dashboard__list_migrations
mcp__Supabase_Dashboard__apply_migration
mcp__Supabase_Dashboard__execute_sql            # SELECT apenas, para depuração
mcp__Supabase_Dashboard__get_advisors           # rodar depois de qualquer DDL
```

**Bloqueados até aprovação explícita do stakeholder:**
```bash
wrangler secret put LASTLINK_WEBHOOK_TOKEN   # produção
wrangler deploy                               # worker/
git push                                      # ambos os repos
```

## 8. Gaps conhecidos e riscos residuais

| Item | Severidade | Detalhe |
|---|---|---|
| E2E real do funil bloqueado | baixa, ambiental | `qa/tests/post-vsl.spec.ts` (pré-existente) e `qa/tests/checkout-url-tagging.spec.ts` (novo) travam esperando o player VTurb (`.esconder` / `display:none`) ficar visível — parece exigir acesso de rede real ao script do VTurb, indisponível neste sandbox. **Não é regressão desta mudança** — confirmado rodando o teste pré-existente isoladamente, mesma falha. Mitigação: `scripts/verify-checkout-tagging.mjs` cobre a lógica sem depender do player. |
| Persistência de UTM em upsell real | baixa | Não confirmado se `Vtid`/UTM sobrevivem no webhook de um upsell real da Lastlink (só simulado). Requer uma compra de teste real na plataforma. |
| Corrida teórica na idempotência | baixa, aceita | Ver decisão #4 na seção 4. |
| Cobertura de teste do caminho de erro (RPC 500) | baixa | `dashboard/tests/campaign-roi.spec.ts` cobre sucesso e vazio, não erro de rede. |
| `.mcp.json` não versionado | média (operacional) | Workspace raiz não é repo git — se alguém clonar os repos individualmente (`dashboard/`, `desafio-treino-trinca-replica/`) sem o workspace inteiro, não herda essa config. Considerar mover para dentro de um dos repos ou documentar a criação manual. |

## 9. Sobre o MCP `Supabase_Dashboard`

Criado nesta sessão em `/Users/brunogovas/Projects/Melhor-Versao-Projetos/.mcp.json`:
```json
{
  "mcpServers": {
    "Supabase_Dashboard": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=zcaypxqrteoedzbdmagm"
    }
  }
}
```
Requereu autorização OAuth interativa do usuário (`/mcp` no Claude Code) na primeira vez. **Se uma nova sessão/máquina não tiver isso autorizado**, as tools `mcp__Supabase_Dashboard__*` não aparecerão — nesse caso, cair para o caminho REST direto (service-role key em `worker/.dev.vars`) para leitura/escrita de dados, e pedir ao usuário para autorizar o MCP via `/mcp` se precisar rodar DDL novamente.

**Cuidado**: existe um outro servidor MCP chamado `Supabase MCP` (global, sem esse `.mcp.json`) que aponta para um projeto **completamente diferente e não relacionado** (`gkzasxwepudomrsewfgj`, um funil de "quiz" com tabela `leads`). **Sempre confirmar via `get_project_url` que está usando `Supabase_Dashboard` (→ `zcaypxqrteoedzbdmagm`) e não `Supabase MCP`** antes de qualquer escrita.

## 10. Como reproduzir a auditoria completa do zero

1. `cd desafio-treino-trinca-replica/worker && npm test` — deve dar 14/14.
2. `npx wrangler dev --port 8787` (background) — usa `.dev.vars`, escreve no Supabase real.
3. `node test/manual/lastlink-campaign-audit.mjs` — 19 chamadas, todas devem retornar `ok:true`.
4. `node test/manual/verify-campaign-audit.mjs` — confere as 25 linhas gravadas, imprime tabela de ROI esperada.
5. (Opcional, requer MCP) `mcp__Supabase_Dashboard__execute_sql` com `select * from rpc_campaign_roi(null,null,null,'<hoje>','<hoje>') where utm_campaign like 'camp_%'` — deve retornar **vazio** (prova que `is_test` é filtrado pela função real).
6. `node test/manual/cleanup-test-data.mjs --confirm` — limpa.
7. `pkill -f "wrangler dev"`.
8. `cd dashboard && npm run lint && npm run build && npx playwright test` — lint/build limpos, 2/2 testes passando.

## 11. Runbook — passos restantes para ir ao ar

**Pré-requisito de todos os passos abaixo: aprovação explícita do stakeholder.**

1. `cd desafio-treino-trinca-replica/worker && wrangler secret put LASTLINK_WEBHOOK_TOKEN` (gerar um token forte antes, ex.: `openssl rand -hex 32`).
2. `wrangler deploy` (mesmo projeto Cloudflare já em produção).
3. Deploy do funil (branch `deploy`, ver `.github/workflows` do repo `desafio-treino-trinca-replica`) — **precisa acontecer** para a URL de checkout começar a ser taggeada.
4. Na Lastlink: cadastrar `https://<worker-domain>/api/lastlink-webhook?token=<mesmo-token-do-passo-1>` como webhook em **cada produto** (venda front + cada upsell/order bump).
5. `cd dashboard && git add <arquivos relevantes> && git commit -m "..."` (revisar o que commitar — ver nota abaixo sobre WIP pré-existente) → delegar `git push` a @github-devops (Gage), nunca @dev.
6. Pós-deploy: fazer uma compra de teste real (`IsTest`) na Lastlink com upsell, conferir no Cloudflare (`wrangler tail` ou `get_logs` via MCP) que o webhook chegou e a linha foi gravada corretamente — isso também fecha o gap da seção 8 sobre persistência de UTM no upsell.
7. Abrir `/roi-campanhas` no dashboard real, confirmar que a venda de teste aparece e os filtros funcionam (fecha o AC 10 literal da Story 1.2).

**Nota sobre commit no `dashboard/`**: o repo já tinha, antes desta feature, modificações não commitadas em `main.tsx`, `app-sidebar.tsx`, `performance.tsx` e outros arquivos (WIP do usuário, não relacionado a esta feature). Ao commitar, considerar separar os hunks/arquivos desta feature do WIP pré-existente, ou confirmar com o usuário se pode ir tudo junto.

## 12. Rollback

- **RPC**: `drop function if exists public.rpc_campaign_roi(text,text,text,date,date);` via MCP/Studio — reversível a qualquer momento, não afeta `funnel_events`.
- **Worker**: `wrangler rollback` (Cloudflare mantém histórico de deploys) ou re-deploy da versão anterior do `src/index.js` sem a rota.
- **Dados gravados por webhooks reais pós-deploy**: **não** fazer rollback destrutivo — são vendas reais. Se a lógica de atribuição precisar de correção, criar uma migration de dados corretiva, não deletar linhas.
- **Funil**: reverter a tag da URL de checkout é um deploy normal do branch `deploy` com o commit anterior.

## 13. Referências

- Stories: `dashboard/docs/stories/1.1.lastlink-webhook-ingestion.story.md`, `dashboard/docs/stories/1.2.campaign-roi-dashboard.story.md`
- Gates QA: `dashboard/docs/qa/gates/1.1.lastlink-webhook-ingestion-gate.yml`, `1.2.campaign-roi-dashboard-gate.yml`
- Auditoria completa: `dashboard/docs/qa/audit-1.1-1.2-2026-07-24.md`
- Doc oficial Lastlink (envelope de webhook): https://support.lastlink.com/pt-BR/articles/12587805-documentacao-de-webhook-da-lastlink
- Doc oficial Lastlink (params de tracking na URL de checkout): https://support.lastlink.com/pt-BR/articles/8377899-como-passar-parametros-de-rastreamento-na-url-de-checkout-da-lastlink
