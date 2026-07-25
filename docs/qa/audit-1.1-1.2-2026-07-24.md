# Auditoria — Stories 1.1 + 1.2 (Atribuição de ROI por Campanha Lastlink)

**Data:** 2026-07-24
**Executor:** @dev (Dex), sob instrução direta do stakeholder (stories em Draft, execução autorizada explicitamente)
**Batch de dados sintéticos:** `dev-audit-2026-07-24` (todos com `metadata.is_test=true`, limpos ao final desta auditoria)

## Status geral

| Story | Status no arquivo | Implementação | Testado | RPC em produção | Deploy |
|---|---|---|---|---|---|
| 1.1 — Lastlink webhook ingestion | Ready for Review | ✅ Completa | ✅ (unitário + integração real, 2 rounds) | ✅ Aplicada e validada | ❌ Não (aguardando aprovação) |
| 1.2 — Página de ROI por Campanha | Ready for Review | ✅ Completa | ✅ (Playwright mockado + RPC real validada) | ✅ (dependência da 1.1 resolvida) | ❌ Não (aguardando aprovação) |

Gate QA: **PASS** para ambas as stories (ver `docs/qa/gates/1.1...yml` e `1.2...yml`). **Nenhum deploy foi feito** (`wrangler deploy` não foi executado, nenhum `git push`).

## Bloqueio de infraestrutura — resolvido por @devops (Gage)

**Atualização:** o bloqueio abaixo foi resolvido durante esta sessão e não é mais uma pendência.

Não havia, neste ambiente, nenhuma credencial ou ferramenta com acesso a **DDL** no projeto Supabase de produção (`zcaypxqrteoedzbdmagm`):
- A `SUPABASE_SERVICE_ROLE_KEY` disponível só dá acesso REST/PostgREST (dados), não execução de SQL arbitrário — confirmado tentando `rpc/exec_sql`, `rpc/execute_sql`, `rpc/sql`, `rpc/query`, `rpc/run_sql` (todos 404).
- O Supabase CLI local está logado, mas numa conta cujos projetos listados (`Funnel-Telemetrics`, `brunocastelanigov-afk's Project`) **não incluíam** `zcaypxqrteoedzbdmagm`.
- O Supabase MCP configurado originalmente apontava para um projeto totalmente diferente e não relacionado (`gkzasxwepudomrsewfgj`, um funil de "quiz" com tabela `leads`).

**Resolução:** @devops (Gage) criou um `.mcp.json` escopado a este workspace (não ao usuário global), com um novo servidor MCP `Supabase_Dashboard` apontando explicitamente para `zcaypxqrteoedzbdmagm` (`https://mcp.supabase.com/mcp?project_ref=zcaypxqrteoedzbdmagm`), sem alterar a conexão MCP global usada por outros projetos. Após o usuário autorizar essa conexão (`/mcp`), a migration foi aplicada com sucesso:
- `apply_migration` → `rpc_campaign_roi` criada.
- `get_advisors(security)` acusou `function_search_path_mutable` (única entre as RPCs do projeto) → corrigido com `alter function ... set search_path = public`.
- Validação com dados reais: reinseridas as 25 linhas sintéticas do batch, confirmado que a tabela tinha os 25 registros mas a função real `rpc_campaign_roi` retornava 0 linhas para essas campanhas (prova que o filtro `is_test` funciona em produção, AC 11) — e a mesma lógica de agregação, rodada via SQL direto sem o filtro `is_test` só para auditoria, bateu exatamente com os números já calculados pela réplica em JS. Dados de teste removidos novamente ao final.

## Story 1.1 — Backend

### Arquivos alterados/criados
- `desafio-treino-trinca-replica/src/lib/funnelTracker.ts` — nova função exportada `buildTaggedCheckoutUrl()`
- `desafio-treino-trinca-replica/src/components/VslStep.tsx` — usa a URL taggeada em vez da URL estática crua
- `desafio-treino-trinca-replica/worker/src/lastlink.js` (novo) — parsing/validação do envelope, resolução de atribuição, token de webhook
- `desafio-treino-trinca-replica/worker/src/index.js` — nova rota `POST /api/lastlink-webhook`
- `desafio-treino-trinca-replica/worker/src/supabase-client.js` — 4 novas funções de leitura (`findLastlinkEventById`, `findCheckoutStartByLeadId`, `findFrontPurchaseByEmail`, `findPurchaseByPaymentId`)
- `desafio-treino-trinca-replica/worker/test/lastlink.test.js` (novo, 11 testes)
- `desafio-treino-trinca-replica/worker/.dev.vars` / `.dev.vars.example` — novo `LASTLINK_WEBHOOK_TOKEN`
- `desafio-treino-trinca-replica/worker/README.md` (novo) — runbook
- `dashboard/supabase/migrations/20260724120000_rpc_campaign_roi.sql` (novo, pendente de aplicação manual)

### Testes unitários (offline, `node --test`)
```
npm test (worker/) → 14 passed, 0 failed
```
Inclui a suíte pré-existente (`worker.test.js`, 3 testes, sem regressão) + a nova (`lastlink.test.js`, 11 testes): token inválido/ausente, JSON malformado, evento fora da allowlist, front matched, front unmatched (sem descartar), upsell matched via e-mail, upsell unmatched, webhook duplicado (idempotência), refund de venda existente, chargeback órfão.

### Auditoria de integração real (Critérios 1 e 2 do goal)

Rodei o worker localmente (`wrangler dev`) — que usa o `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` reais do `.dev.vars` — e enviei, via `worker/test/manual/lastlink-campaign-audit.mjs`, **10 campanhas distintas** simulando cenários reais (payloads completos conforme a [documentação oficial de webhook da Lastlink](https://support.lastlink.com/pt-BR/articles/12587805-documentacao-de-webhook-da-lastlink), incluindo `Products`, `Buyer`, `Purchase` com `Price.Value` em reais convertido para `price_cents`, e `Utm`):

1. Front only, sem upsell
2. Front + upsell (ambos matched)
3. Front + upsell, front depois estornado (refund)
4. Front + upsell, upsell com chargeback
5. Front only, com refund total
6. Front + 2 upsells sequenciais (order bumps)
7. Front com `Vtid` ausente → unmatched
8. Upsell sem front correspondente (e-mail não bate) → unmatched
9. Webhook duplicado (mesmo `Id` reenviado) → idempotência
10. Refund de venda inexistente (órfão) → gravado, nunca descartado

**Resultado: 19/19 chamadas processadas corretamente** (nenhuma rejeitada inesperadamente). Todas as 25 linhas gravadas em `funnel_events` foram verificadas via `worker/test/manual/verify-campaign-audit.mjs`:

| event_type | linhas |
|---|---|
| checkout_start | 7 |
| purchase | 8 |
| purchase_upsell | 6 |
| purchase_refunded | 3 |
| purchase_chargeback | 1 |

3 linhas `unmatched` confirmadas (nenhuma descartada, conforme AC 5/7), duplicata corretamente **não** duplicada (`{"ok":true,"deduplicated":true}`).

### Validação do cálculo de ROI (replicando a lógica da RPC em JS, já que a função ainda não está aplicada em produção)

| Campanha | Front | Upsell | Total | Estornado | Não atribuída |
|---|---|---|---|---|---|
| facebook / camp_two_upsells | R$197,00 | R$74,00 | **R$271,00** | R$0,00 | — |
| google / camp_front_upsell | R$197,00 | R$47,00 | **R$244,00** | R$0,00 | — |
| facebook / camp_front_only | R$197,00 | R$0,00 | **R$197,00** | R$0,00 | — |
| tiktok / camp_upsell_chargeback | R$197,00 | R$0,00 | **R$197,00** | R$97,00 | — |
| facebook / camp_duplicate | R$197,00 | R$0,00 | **R$197,00** | R$0,00 | — |
| facebook / camp_front_refund | R$0,00 | R$47,00 | **R$47,00** | R$197,00 | — |
| google / camp_front_full_refund | R$0,00 | R$0,00 | **R$0,00** | R$197,00 | — |
| instagram / camp_unmatched_front | R$0,00 | R$0,00 | R$0,00 | R$0,00 | R$197,00 |
| Sem UTM / Sem campanha | R$0,00 | R$0,00 | R$0,00 | R$0,00 | R$244,00 |

Validado manualmente linha a linha: refund/chargeback abatem exatamente o valor da venda original na campanha correta (não afetam outras campanhas), duplicata não gera dupla contagem, e receita não-atribuída fica isolada (nunca soma no total front/upsell). Resultado salvo em `worker/test/manual/campaign-audit-result.json`.

### Pendências / limitações documentadas
- **AC 10 (RPC em produção)**: SQL pronta, aplicação manual pendente (ver seção de bloqueio acima).
- **Persistência de UTM em upsell real da Lastlink**: a documentação oficial não confirma explicitamente se os parâmetros de tracking persistem no webhook de um upsell/order bump real (só simulamos isso sinteticamente). A própria story já marca isso como validação manual pendente com uma compra de teste real — não foi possível fazer uma compra real nesta auditoria.
- **Task 9 da story (fora de escopo do MVP)**: campanhas agnósticas multi-produto e reconciliação assíncrona de upsells unmatched — não implementadas, como já documentado na própria story.

## Story 1.2 — Frontend

### Arquivos alterados/criados
- `dashboard/src/lib/dashboard-types.ts` — `CampaignRoiRow`
- `dashboard/src/lib/dashboard-queries.ts` — `fetchCampaignRoi()`
- `dashboard/src/lib/format.ts` — `formatCurrency()`
- `dashboard/src/pages/campaign-roi.tsx` (novo)
- `dashboard/src/main.tsx` — rota `/roi-campanhas`
- `dashboard/src/components/composites/app-sidebar.tsx` — item "ROI de Campanhas"
- `dashboard/playwright.config.ts` (novo) + `dashboard/tests/campaign-roi.spec.ts` (novo)
- `package.json`/`package-lock.json` — `@playwright/test` adicionado como devDependency

### Verificações
- `npm run lint` (oxlint) → sem erros
- `npm run build` (`tsc -b && vite build`) → sem erros novos (warning de chunk size é pré-existente, não relacionado)
- **Playwright (2 testes, ambos passando)**: autenticação e as 2 RPCs consumidas (`rpc_dashboard_filter_options`, `rpc_campaign_roi`) mockadas via `page.route`, validando que a página renderiza corretamente `MetricCard`s e a tabela a partir de um payload no formato `CampaignRoiRow[]`, e que o estado vazio do `DataGrid` ("Nenhum dado encontrado.") aparece quando a RPC não retorna linhas. Isso comprova que a "fiação" do frontend está correta **independente** de a RPC real já estar aplicada em produção.
- **Auditoria de design system (Critério 4)**: todos os componentes usados em `campaign-roi.tsx` vêm de `@/components/atoms/*` ou `@/components/composites/*` (`MetricCard`, `FilterBar`, `DataGrid`, `Skeleton`) — nenhum HTML cru estilizado à mão fora do wrapper de layout padrão já usado por `performance.tsx`/`auditoria.tsx`, nenhuma cor hardcoded fora de classes Tailwind/CSS vars já em uso.

### Nota sobre estado do repositório
O repositório `dashboard/` já tinha, antes desta tarefa, modificações **não commitadas** em `main.tsx`, `app-sidebar.tsx` e `performance.tsx` (WIP pré-existente do usuário, branch `main`, 2 commits à frente de `origin`). Editei em cima do estado atual desses arquivos sem descartar nada — nenhum `git checkout`/`git restore` foi executado. Nenhum commit foi feito nesta tarefa.

## Story 1.1 — Task 1 (checkout taggeado): verificação

O e2e real (`desafio-treino-trinca-replica/qa/tests/checkout-url-tagging.spec.ts`, novo) trava esperando o player VTurb carregar — a mesma limitação já existe no teste **pré-existente** `qa/tests/post-vsl.spec.ts` (confirmado rodando-o isoladamente: mesmo timeout, mesma causa — dependência de rede externa ao script de vídeo, não uma regressão desta mudança).

Como verificação alternativa direta, `desafio-treino-trinca-replica/scripts/verify-checkout-tagging.mjs` (novo) transpila `funnelTracker.ts` e chama `buildTaggedCheckoutUrl()` isoladamente, confirmando:
- Inclui exatamente os 7 params de atribuição documentados pela Lastlink + `vtid` (lead_id)
- **Não** inclui `utm_id`/`gclid`/`fbclid`/`ttclid` (não documentados)
- `vtid` é estável entre chamadas para o mesmo lead/sessão

```
node scripts/verify-checkout-tagging.mjs
→ OK: buildTaggedCheckoutUrl inclui exatamente os 8 params documentados pela Lastlink
  (7 de atribuição + vtid), exclui não documentados, e é estável para o mesmo lead.
```

O e2e via UI fica disponível em `qa/tests/checkout-url-tagging.spec.ts` para quando o ambiente tiver acesso de rede ao player VTurb (ou em CI com rede liberada).

## Limpeza de dados de teste

Todas as linhas sintéticas foram identificadas com precisão via `worker/test/manual/cleanup-test-data.mjs` (dry-run confirmado, filtro por `lead_id` e `metadata->>lastlink_event_id`, nenhuma linha real de produção capturada) e removidas com `--confirm` — **em dois rounds**: o primeiro antes da revisão do QA (25 linhas), e um segundo (mais 25 linhas) gerado especificamente para validar a função `rpc_campaign_roi` já aplicada em produção. Tabela `funnel_events` confirmada sem nenhum resquício de dado de teste ao final (`select count(*) ... = 0`).

## QA (Quinn) e DevOps (Gage)

- **QA**: revisão completa das duas stories, gate **PASS** em ambas (`docs/qa/gates/*.yml`). Um achado real corrigido durante a revisão: `GRANT EXECUTE` faltante na migration.
- **DevOps**: resolveu o bloqueio de infraestrutura configurando um Supabase MCP escopado a este projeto (`.mcp.json`, servidor `Supabase_Dashboard`), aplicou a migration em produção, e corrigiu um segundo achado (`function_search_path_mutable`, via `get_advisors`) que só apareceu depois que a função existia de fato.

## Próximos passos para o stakeholder

1. Ler este resumo e validar os números/comportamento reportados.
2. ~~Aplicar a migration em produção~~ — **feito** por @devops nesta sessão.
3. ~~Rodar `/AIOS:agents:qa *review`~~ — **feito**, gate PASS em ambas as stories.
4. Aprovar deploy: `wrangler deploy` (worker, inclui `wrangler secret put LASTLINK_WEBHOOK_TOKEN` em produção primeiro) e `git push` (dashboard, dispara deploy via Vercel) — nenhum dos dois foi executado, aguardando sua aprovação explícita.
5. Cadastrar a URL do webhook (`/api/lastlink-webhook?token=...`) em cada produto Lastlink (front + upsells) após o deploy do worker — ver `worker/README.md`.
