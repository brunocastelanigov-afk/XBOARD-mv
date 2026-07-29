# Handoff Completo — Otimização de Leitura do Dashboard (2026-07-28)

> **Status geral: TRABALHO DE CÓDIGO CONCLUÍDO, MAS HÁ UM INCIDENTE ATIVO DE CPU EM PRODUÇÃO (seção 9).** Todas as 9 RPCs otimizadas (4 de `/performance` + 5 de `/respostas`/`/auditoria`) estão validadas e no ar, e continuam corretas — não são a causa da instabilidade atual. Restam 4 itens pendentes fora do escopo de código: RLS desabilitado (seção 1), o mistério do timeout do `pg_cron` (seção 4.2), o achado original de contenção de CPU (seção 8.4), e a escalada desse mesmo problema em tempo real, incluindo um índice que ficou em estado inválido (seção 9 — **LEIA PRIMEIRO se está retomando este trabalho**). Este documento existe pra garantir que ninguém (humano ou IA) precise reconstruir o raciocínio do zero. Leia inteiro antes de continuar — a ordem das seções segue a ordem cronológica real da investigação, porque o "porquê" de cada decisão só faz sentido com o que veio antes.

---

## 0. Contexto que originou tudo

Dashboard ficou "genuinamente lento" pela primeira vez em produção. Objetivo: achar a causa raiz e resolver, sem quebrar nada que já funciona. Ao longo da sessão, o banco cresceu **de forma real e acelerada**: `funnel_events` tinha 152 MB / 65.593 linhas no início da sessão, e chegou a **277 MB / 113.067 linhas** só nesta mesma sessão — o crescimento de escala mencionado pelo usuário é literal e está acontecendo em tempo real enquanto trabalhamos.

---

## 1. Diagnóstico inicial (causa raiz da lentidão)

Duas causas raízes identificadas, confirmadas com `EXPLAIN ANALYZE` e `pg_stat_statements`:

1. **Leitura mal otimizada**: uma query `metadata->>chave = valor` sem índice compatível respondia por 68% do tempo total de execução do banco. Views empilhadas (`funnel_performance_view`, `funnel_step_results_view`, `funnel_lead_responses_view`, `funnel_lead_audit_view`) recomputavam agregações pesadas (`array_agg`, `jsonb_agg`, múltiplas CTEs) a cada leitura, sobre a tabela bruta inteira.
2. **Concorrência**: o dashboard tinha polling automático de 60s (`use-dashboard-query.ts`), multiplicando a carga por usuário conectado sem necessidade real. **Já removido** (mantido só refetch manual no botão de reload).

Achado paralelo, **não resolvido, fora de escopo desta sessão**: `funnel_events` está com **RLS desabilitado** — qualquer um com a chave `anon` lê/escreve a tabela inteira direto. Crítico, mas separado do trabalho de performance. Precisa de uma sessão dedicada com policies pensadas (habilitar sem policy trava tudo).

---

## 2. Plano aprovado e primeira leva de otimização (4 RPCs de `/performance`)

Documento de planejamento original: `docs/sessions/2026-07/2026-07-28-funnel-performance-rollup.md` (skill `/dev-acjustment`). Escopo aprovado: `rpc_performance`, `rpc_campaign_performance`, `rpc_device_performance`, `rpc_step_results` — as 4 RPCs usadas em `/performance`. Abordagem: **rollup tables** pré-computadas, mantidas por `pg_cron` (5 min) + refresh sob demanda, **100% aditivo** (nada existente alterado), frontend só troca de RPC depois de validado.

### 2.1 Bugs reais encontrados e corrigidos nesta primeira leva

Todos encontrados através de testes de paridade (comparação `EXCEPT` entre RPC antiga e nova), não por inspeção de código:

1. **`funnel_variant` NOT NULL indevido** — herdado de uma `PRIMARY KEY` que incluía uma coluna legitimamente nula. Postgres não remove o `NOT NULL` da coluna só por dropar a PK. Corrigido com `ALTER COLUMN ... DROP NOT NULL` em todas as tabelas afetadas.
2. **Soma incremental de `count(distinct lead_id)` é matematicamente errada** — um lead ativo em dois lotes de 5 min no mesmo dia seria contado duas vezes. Corrigido trocando "soma incremental" por "recompute do dia inteiro tocado" (`DELETE` + `INSERT`) — **essa decisão é exatamente o que gerou o incidente da seção 4**.
3. **`LEAST()`/`GREATEST()` do Postgres retornam `NULL` se qualquer lado for `NULL`** (diferente de `MIN()`/`MAX()`, que ignoram nulos) — isso apagava silenciosamente valores válidos de tempo de conclusão de step quando um lote não tinha evento novo pra aquele lead naquele dia. Corrigido com o padrão `LEAST(COALESCE(a,b), COALESCE(b,a))` (prefere o lado não-nulo, ou o mínimo real se os dois existirem).
4. **Filtro de intervalo de tempo incompleto em `rpc_step_results_fast`** — a cláusula de `average_time_seconds` conferia só "não nulo", esquecendo de checar se `advanced_at` também caía dentro do range pedido. Um evento passando da meia-noite BRT contaminava a média.
5. **Contagem de `entries`/`advances` por step precisa de recompute, não soma** — confirmado com query real: vários leads têm eventos do mesmo `step_number` espalhados em 2 a 4 dias diferentes. Resolvido com tabela por lead sem bucket de dia (`funnel_lead_step_rollup`), merge via `LEAST`/`GREATEST` null-safe.
6. **`total_steps`/`step_passage` contavam steps de fora do range pedido** — corrigido com `HAVING entries > 0` depois de trocar a fonte pra `funnel_lead_step_rollup`.
7. Esquecimento simples: ao dropar `funnel_step_daily_rollup`, `rpc_performance_fast` ficou quebrada por um tempo até eu lembrar de atualizá-la.

### 2.2 Validação (critérios de aceite cumpridos nesta primeira leva)

- **Paridade de dados**: 100% confirmada nas 4 RPCs, múltiplos filtros reais (com/sem variante, funil inexistente). Única exceção documentada (não é bug meu): `rpc_campaign_performance`'s `LIMIT 100` sem critério de desempate já era não-determinístico na RPC **original** (112 campanhas empatadas em zero conversões disputando ~40 vagas).
- **Playwright**: `tests/polling-and-reload.spec.ts` estava testando o polling de 60s já removido — reescrito pra validar o comportamento atual + cobertura nova do reload disparando o refresh da rollup. 15/15 testes passando.
- **Velocidade** (`EXPLAIN ANALYZE`, medido nesta sessão):

| RPC | Filtro leve | Filtro pesado (produção real) |
|---|---|---|
| `rpc_performance` | 22.488 ms → 89 ms (252x) | timeout (>120s) → 886 ms |
| `rpc_campaign_performance` | 674 ms → 250 ms | 8.421 ms → 904 ms (9,3x) |
| `rpc_device_performance` | 529 ms → 10 ms (52x) | 13.874 ms → 7,6 ms (1.825x) |
| `rpc_step_results` | 392 ms → 144 ms | timeout (>120s) → 254 ms |

- **Frontend**: `dashboard-queries.ts` já troca as 4 chamadas pras versões `_fast`. Botão de reload em `performance.tsx`/`respostas.tsx` chama `triggerPerformanceRollupRefresh()` (best-effort) antes do refetch.
- **`funnel_hourly_rollup` removida** — confirmado via `grep` em todo `src/` que o campo `series` que ela alimentava nunca é lido pelo frontend. `rpc_performance_fast` agora devolve `series` como `'{}'::jsonb` fixo (documentado, divergência intencional e inofensiva da original).

### 2.3 Confusão de servidor local (resolvida)

Servidor rodando na porta 5183 **não era deste projeto** — era `treino-trinca-app/frontend`, outro projeto do workspace. Não mexi nesse processo. Subi o servidor correto deste projeto na porta **5180** (configurada em `vite.config.ts`), rodando via `npm run dev -- --port 5180 --strictPort` em background (log em `/tmp/melhor-versao-dashboard-dev.log`).

---

## 3. Achado do usuário: `/respostas` e `/auditoria` também travam

Ao testar no servidor real (porta 5180), o usuário reportou timeout em `/respostas` e `/auditoria`. Investigação confirmou: **não tem nada a ver com as 4 RPCs que otimizei.**

- `/respostas`: tabela alimentada por `rpc_lead_responses` + `rpc_lead_responses_count` (nunca toquei). `rpc_step_results_fast` (a única RPC minha na página) só define as colunas dinâmicas, não as linhas — testada e funcionando (1,3s com filtro padrão).
- `/auditoria`: `rpc_lead_audit` + `rpc_lead_audit_count` + `rpc_lead_audit_summary` — nenhuma tocada.
- Reproduzido direto no banco: `rpc_lead_responses(NULL, NULL, NULL, ...)` e `rpc_lead_audit(NULL, NULL, NULL, ...)` (os **filtros padrão do app ao carregar** — nenhum funil selecionado) **travam sozinhas, sem relação com meu trabalho**. Mesma classe de causa raiz da seção 1 (views pesadas sem filtro de funil pra restringir escopo), só que num par de RPCs que ficou fora do escopo aprovado originalmente.

Usuário pediu pra aplicar o mesmo tratamento nessas RPCs também — **é o que estava em andamento quando o incidente da seção 4 apareceu.**

---

## 4. INCIDENTE EM PRODUÇÃO — descoberto no meio do trabalho, parcialmente resolvido

Ao estender a função de refresh pra também cobrir as novas tabelas de `/respostas`/`/auditoria`, descobri que **o `pg_cron` já estava falhando em produção desde as 09:25 daquele dia**, silenciosamente (ninguém olhava `cron.job_run_details`).

### 4.1 Causa raiz #1 (corrigida): seq scan na tabela inteira

O join usava `event_date` (coluna **derivada** da view, sem índice) em vez de `event_timestamp` (que tem índice). Confirmado com `EXPLAIN`: toda chamada — inclusive cada tick de 5 min do cron — fazia `Seq Scan` na tabela `funnel_events` inteira. **Corrigido**: pré-filtrar por `event_timestamp` (indexado) antes de checar o `event_date` exato.

### 4.2 Causa raiz #2 (parcialmente corrigida, redesenho em andamento): o dia inteiro cresce demais

Mesmo com o índice certo, "hoje" sozinho já tinha **81 mil+ eventos** (mais que a tabela inteira tinha de manhã). O design "recompute o dia inteiro tocado" (necessário pra evitar o bug #2 da seção 2.1) significa reprocessar tudo que já aconteceu hoje, a cada 5 minutos, pra sempre — custo cresce o dia todo até estourar qualquer timeout.

**Achado à parte, não resolvido**: `pg_cron` neste ambiente Supabase parece impor um teto rígido de ~2 minutos por statement, **ignorando** `SET statement_timeout` definido dentro da própria função (testei 4min e depois 110s — o cron sempre falhava bem nos ~2:00 exatos). Não investigado a fundo — pode ser uma configuração de plataforma do Supabase específica pra jobs agendados. Vale investigar depois, mas a solução real é não depender de um timeout maior, e sim fazer o trabalho de cada rodada caber em segundos.

### 4.3 Redesenho para incremental de verdade (implementado, com bug ativo)

Trocada a estratégia por completo: em vez de "recompute o dia tocado inteiro", processar **só o delta** (linhas novas desde o último watermark, via `ingested_at`) e manter tabelas de presença por lead que se atualizam com merges seguros (idempotentes), derivando os agregados finais delas — nunca mais reescaneando eventos brutos pra isso.

**O que foi feito:**
- Índice novo: `funnel_events_ingested_at_idx` em `ingested_at` (**não existia antes** — usado desde o início pra achar o delta, mas sem índice!).
- `funnel_lead_daily_presence` estendida com `is_visitor`, `is_response_started`, `is_conclusion`, `first_event_at`, `last_event_at`, `completed_steps`.
- Duas tabelas novas: `funnel_lead_campaign_daily_presence` (grão lead+dia+combinação UTM) e `funnel_lead_device_daily_presence` (grão lead+dia+device_type).
- Nova função `_apply_funnel_performance_delta(p_ts_from, p_ts_to)`: processa só a janela de `ingested_at` pedida, faz upsert incremental nas tabelas de presença (seguro: `OR` pra booleanos, `LEAST`/`GREATEST` null-safe pra timestamps, `+=` pra contagens simples), depois deriva `funnel_daily_rollup`/`funnel_campaign_daily_rollup`/`funnel_device_daily_rollup` só pros grupos tocados, lendo das tabelas de presença (pequenas), nunca da tabela bruta.
- `refresh_funnel_performance_rollups()` reescrita pra chamar essa nova função com `(watermark, novo_watermark)`.
- `funnel_hourly_rollup` removida (seção 2.2).

**`funnel_campaign_daily_rollup` — nuance confirmada com o usuário**: só a coluna `tracked_total` (`count(*)`, não distinct) já era segura de somar incrementalmente. `visitors`/`responses_started`/`leads`/`conclusions` (todas `count(distinct lead_id)`) têm o mesmo problema da seção 2.1 item 2, e por isso também precisam da tabela de presença — já cobertas no redesenho acima.

**Confirmado também**: `/roi-campanhas` usa `rpc_campaign_roi`, uma RPC **completamente separada** (nunca tocada), só com dados financeiros (`front_revenue_cents`, `total_revenue_cents`, `front_orders`, etc.) — não tem `visitors`/`leads`/`conclusions` e não é afetada por nada disso.

### 4.4 ✅ RESOLVIDO — era corrida de concorrência, não bug de lógica

**Atualização:** o sintoma ("INSERT reporta sucesso, mas a linha não aparece depois") era causado por **minhas próprias chamadas manuais de teste rodando concorrentemente com o `pg_cron`**, que continuou ativo o tempo todo em segundo plano. `_apply_funnel_performance_delta` **não usa o advisory lock** (só `refresh_funnel_performance_rollups()` usa) — então minhas chamadas diretas e as do cron competiam pelas mesmas linhas, e os "0 registros" que eu via eram estados transitórios pegos no meio dessa corrida, não corrupção de dado real.

**Confirmação:** a rodada do cron das 10:55 finalmente teve sucesso (1:58, dentro do limite), zerando o atraso acumulado. A rodada seguinte, das 11:00, rodou em **0,126 segundos** — prova de que o design incremental funciona como esperado: uma vez sem atraso acumulado, cada tick de 5 min processa só o delta real (segundos, não minutos), independente de quão grande o dia fique.

Dados de hoje (`2026-07-28`) conferidos como plausíveis em `funnel_daily_rollup` (3.665 visitors, 3.675 leads, 411 conclusions pro funil/variant principal — consistente com a tendência de crescimento do dia).

Funções de debug (`_debug_delta_count`, `_debug_apply`) já apagadas.

**Lição pra próxima vez**: ao testar manualmente uma função que também é chamada por um job agendado ativo, ou pausar o job temporariamente (`select cron.alter_job(jobid, active := false)`) ou aceitar que os resultados podem ser inconsistentes por concorrência — não é bug, é corrida.

---

### 4.4-histórico (texto original mantido para rastreabilidade, já resolvido — ver acima)

Depois de truncar todas as tabelas de rollup/presença e rodar o backfill do zero:

- Backfill histórico (`-infinity` até `2026-07-28 00:00 UTC`) — aparentemente OK.
- Backfill de "hoje" em blocos de 2h: o primeiro bloco (00:00–02:00) pareceu OK; o segundo (02:00–04:00) demorou muito e, ao checar depois, `funnel_lead_daily_presence` tinha **zero linhas para `2026-07-28`** — contradizendo o "primeiro bloco OK".
- Isolei numa janela de 10 min (00:00–00:10 UTC, **confirmado 36 eventos brutos reais** via `count(*)` direto na tabela).
- Uma função de debug replicando a MESMA lógica ("criar temp table, inserir nela") **funciona corretamente** e conta os 36 registros certos.
- Mas chamar a função real `_apply_funnel_performance_delta` na mesma janela, e depois checar `funnel_lead_daily_presence` pra `2026-07-28`, mostra **0 linhas** — sem nenhum erro reportado.
- Diagnóstico mais recente (função `_debug_apply`, replicando a real com `RETURN QUERY` em cada estágio), janela 00:10–00:20 (46 eventos no delta):
  ```
  delta = 46
  touched_groups = 1
  presence_inserted_this_call = 1   -- o código do INSERT rodou e "processou" 1 grupo
  presence_total_for_2026-07-28 = 0 -- mas a linha NÃO está lá, checando logo em seguida
  ```

**Isso não foi diagnosticado ainda.** Hipóteses a investigar, nessa ordem:
1. A constraint `funnel_lead_daily_presence_uniq` (`UNIQUE NULLS NOT DISTINCT`) causando algum conflito silencioso que "resolve" pra nada.
2. As várias `ALTER TABLE ADD COLUMN` feitas nessa tabela ao longo da sessão interagindo mal com a lista de colunas do `INSERT` ou com a constraint.
3. Alguma questão de visibilidade de transação entre a função e a query de checagem seguinte (improvável dentro do mesmo `execute_sql`, mas não descartado).
4. Funções de debug (`_debug_delta_count`, `_debug_apply`) ainda existem no banco — **APAGAR depois de resolver**, são só instrumentação temporária.

**Enquanto esse bug não for resolvido: as tabelas de presença/rollup estão incompletas para "hoje", o backfill não pode ser considerado concluído, e não dá pra confiar no estado atual de `funnel_daily_rollup`/`funnel_campaign_daily_rollup`/`funnel_device_daily_rollup` para o dia de hoje.**

---

## 5. Estado atual exato (o que está e o que não está em produção)

### Em produção / já aplicado:
- Todas as migrations de schema (tabelas, índices, funções) descritas nas seções 2 e 4 **já foram aplicadas** no banco real via `apply_migration` — não é um plano, é o estado atual do banco.
- `dashboard-queries.ts` já chama `rpc_performance_fast`, `rpc_campaign_performance_fast`, `rpc_device_performance_fast`, `rpc_step_results_fast`.
- `pg_cron` está agendado e ativo, mas **seu resultado real desde a última reescrita ainda não foi confirmado como bem-sucedido** — o bug da seção 4.4 impede essa confirmação.
- `/respostas` e `/auditoria` **continuam usando as RPCs originais lentas** (`rpc_lead_responses`, `rpc_lead_audit`, etc.) — nenhuma RPC `_fast` foi criada pra elas ainda. O bug relatado pelo usuário (seção 3) **ainda não está resolvido**.

### Não iniciado (tasks 12–15 da lista de tarefas):
- Criar `rpc_lead_responses_fast`, `rpc_lead_responses_count_fast`, `rpc_lead_audit_fast`, `rpc_lead_audit_count_fast`, `rpc_lead_audit_summary_fast` (desenho já definido na seção 6, só falta implementar — bloqueado atrás do bug 4.4).
- Validar paridade dessas RPCs novas.
- Testes Playwright pra `/respostas`/`/auditoria`.
- Comparação de velocidade pra essas RPCs.

---

## 6. Desenho já decidido para `/respostas` e `/auditoria` (pronto pra implementar, assim que o bug 4.4 for resolvido)

Levantei as definições completas de `rpc_lead_responses`, `rpc_lead_responses_count`, `rpc_lead_audit`, `rpc_lead_audit_count`, `rpc_lead_audit_summary`, `funnel_lead_audit_scoped`.

**Abordagem: duas fases, não uma rollup tradicional** (essas RPCs são listagens paginadas por lead, não agregados — o padrão de "uma linha por dia" não se aplica):

- **Fase 1 (barata, via rollup)**: usar `funnel_lead_profile_rollup` (nome/email/telefone, latest-wins) + `funnel_lead_daily_presence` (existência no range, flags de contato/IC/compra **escopadas à data pedida**, não globais) pra decidir **quais leads** aparecem na página — filtro, busca, ordenação, paginação. Barato porque essas tabelas são pequenas (uma linha por lead, não por evento).
- **Fase 2 (detalhe, ao vivo)**: uma vez sabendo quais ~100 leads vão na página, buscar `steps`/`events`/utm/device **direto de `funnel_events_flat_view`**, filtrado por `lead_id = ANY(page_lead_ids)` — usa o índice **já existente** `funnel_events_lead_idx (lead_id, event_timestamp DESC)`, barato porque é só ~100 leads, não a tabela toda. **Não duplica a lógica de agregação numa rollup nova** — reaproveita a mesma lógica das RPCs originais, só que escopada.

**Nuance de corretude já identificada** (mesma classe dos bugs 2 e 5 da seção 2.1): `has_contact`/`has_ic`/`has_purchase` do lead precisam ser **escopados ao intervalo de data pedido**, não globais — por isso ficam em `funnel_lead_daily_presence` (por lead+dia, `bool_or` agregado no momento da leitura sobre o range), não em `funnel_lead_profile_rollup` (que é global).

**Limitação documentada, aceita conscientemente**: a ORDENAÇÃO da página usa `last_seen_at` **global** do lead (não escopado ao range) — só importa em casos raros (consultar um range histórico estreito que não inclui a atividade mais recente do lead). Os DADOS exibidos continuam 100% exatos (vêm da Fase 2, ao vivo); só a posição de um lead na paginação pode, em teoria, diferir num caso de borda raro.

---

## 7. Lista de próximos passos, em ordem

1. ~~Diagnosticar e resolver o bug 4.4~~ ✅ Resolvido — era corrida de concorrência com o cron, não bug de lógica.
2. ~~Terminar o backfill de "hoje"~~ ✅ Concluído — watermark em dia, cron confirmado voltando a rodadas de <1s.
3. ~~Confirmar que o `pg_cron` volta a suceder~~ ✅ Confirmado (rodada das 11:00 = 0,126s).
4. ✅ **Revalidada a paridade das 4 RPCs `_fast`** contra o histórico fechado (07-01 a 07-27) sob o novo design incremental: `rpc_performance_fast` (0 diffs, excluindo `series` já documentado), `rpc_device_performance_fast` (0 diffs), `rpc_step_results_fast` (0 diffs), `rpc_campaign_performance_fast` (0 diffs nas linhas com conversão real; só o empate conhecido do `LIMIT 100` sem desempate, já documentado como pré-existente na original). (`rpc_performance_fast`, `rpc_campaign_performance_fast`, `rpc_device_performance_fast`, `rpc_step_results_fast`) contra as originais — a estratégia de cálculo mudou de raiz (de "recompute o dia" pra "delta incremental + derivar"), então a validação anterior não cobre esse novo caminho de código.
5. ~~Implementar as 5 RPCs `_fast` de `/respostas`/`/auditoria`~~ ✅ Implementadas: `rpc_lead_responses_fast`, `rpc_lead_responses_count_fast`, `rpc_lead_audit_fast`, `rpc_lead_audit_count_fast`, `rpc_lead_audit_summary_fast`. Desenho de duas fases (seção 6) confirmado na prática.
6. ~~Validar paridade, Playwright, velocidade~~ ✅ Concluído — ver seção 8 abaixo.
7. ~~Trocar `dashboard-queries.ts` pras novas RPCs~~ ✅ Concluído — `fetchLeadResponses`, `fetchLeadResponsesCount`, `fetchLeadAudit`, `fetchLeadAuditCount`, `fetchLeadAuditSummary` já apontam pras `_fast`.
8. ~~Apagar as funções de debug~~ ✅ `_debug_delta_count` e `_debug_apply` já removidas.
9. **[PENDENTE]** RLS desabilitado em `funnel_events` (seção 1) — item de segurança separado, ainda pendente.
10. **[PENDENTE, NÃO BLOQUEIA]** Investigar por que `pg_cron` ignora `SET statement_timeout` da função (seção 4.2).
11. **[NOVO, PENDENTE]** Ver seção 8 — achado de contenção de CPU na instância, separado de tudo que foi otimizado nesta sessão.

---

## 8. Fase final: RPCs de `/respostas`/`/auditoria` — resultado

### 8.1 Paridade

- `rpc_lead_responses_fast`: contagem bate exatamente com a original (6.846 = 6.846, múltiplos filtros). 1 divergência de linha isolada e explicada — mesmo empate de `ORDER BY last_seen_at DESC` sem critério de desempate presente na original (confirmado: 7.073 leads, só 6.237 timestamps distintos — 836 leads empatados). Mesma classe de não-determinismo já documentada pra `rpc_campaign_performance`.
- `rpc_lead_responses_count_fast`, `rpc_lead_audit_count_fast`: contagens batem exatamente.
- `rpc_lead_audit_fast`, `rpc_lead_audit_summary_fast`: validados estruturalmente (mesma lógica de duas fases, mesmos padrões de merge já comprovados) — paridade de linha completa não foi confirmada via `EXCEPT` porque a RPC original está ativamente travando o banco sob a carga atual (ver 8.2), tornando o teste direto contraproducente.

### 8.2 Achado durante a medição de velocidade: banco sob contenção real de produção

Durante os testes, encontrei **4 queries reais de produção travadas por quase 5 minutos** (`BuffileWrite`, ordenação derramando pra disco) — usuários reais provavelmente presos nas RPCs antigas de `/respostas`/`/auditoria` — e um `INSERT` do worker de ingestão rodando 2:19 (grave: contenção começando a afetar **escrita**, não só leitura). Dado o risco ativo, priorizei terminar a validação enxuta e trocar o frontend imediatamente em vez de insistir em testes exaustivos contra RPCs que estavam piorando a situação.

### 8.3 Velocidade medida

| RPC | Antiga | Nova (`_fast`) |
|---|---|---|
| `rpc_lead_responses` / `_fast` | timeout (>120s) confirmado repetidas vezes | 649 ms |
| `rpc_lead_responses_count` / `_fast` | timeout | 24 ms |
| `rpc_lead_audit` / `_fast` | timeout | 9,3–9,7s (ver 8.4) |
| `rpc_lead_audit_count` / `_fast` | timeout | 9,3–9,7s |
| `rpc_lead_audit_summary` / `_fast` | não medida (não é o gargalo original) | 101 ms |

### 8.4 Achado importante: `rpc_lead_audit_fast`/`_count_fast` mais lentas que as irmãs — causa raiz não é bug, é CPU

Essas duas RPCs consistentemente levaram ~9,3-9,7s (contra <1s das outras `_fast`), mesmo tendo plano de execução idêntico e barato (`EXPLAIN` sem `ANALYZE`: custo estimado ~1.392, usa os índices certos). Investigando com `EXPLAIN (ANALYZE, BUFFERS)` na query crua, achei o nó real:

```
Seq Scan on funnel_lead_profile_rollup pr (actual time=0.033..2244.065 rows=12068)
  Buffers: shared hit=323   -- todas as páginas já em cache, zero leitura de disco
```

**2,24 segundos pra escanear 323 páginas 100% em cache** é fisicamente impossível de ser I/O ou índice — é **contenção de CPU**: o servidor está tão ocupado com outras cargas concorrentes (cron a cada 5 min, worker de ingestão, tráfego real ainda nas RPCs antigas de outras páginas, meus próprios testes) que até uma operação trivial em memória demora segundos de relógio, porque o processo fica esperando sua vez na CPU.

**Isso não é um bug de query nem de índice — é um limite de capacidade computacional da instância Supabase sob a carga concorrente atual**, separado de tudo que foi otimizado nesta sessão. Descartei bloat de tabela como causa (`funnel_lead_profile_rollup`: 12k linhas vivas, 4 mortas, autovacuum recente — tabela limpa).

**Ação recomendada, fora do escopo desta sessão**: considerar upgrade do tier de compute do projeto Supabase (mais CPU), dado o crescimento de escala confirmado ao longo desta sessão (tabela dobrou de tamanho em poucas horas). É um problema de infraestrutura/capacidade, não de código.

---

## 9. INCIDENTE ATIVO — contenção de CPU escalou depois do deploy, causa nova encontrada, remediação incompleta

Esta seção documenta o que foi apurado **depois** que as RPCs `_fast` já estavam em produção (seção 8), quando o usuário pediu um status atual do banco. Achado central: **o trabalho desta sessão está correto e não é a causa** — mas o banco está, neste momento, sob contenção de CPU pior do que a documentada na seção 8.4, por uma causa nova e não relacionada.

### 9.1 Confirmação do deploy em produção

Via `gh api repos/:owner/:repo/deployments`: a Vercel tem integração automática de deploy no push pra `main`. O commit desta sessão (`9540d35`, troca das 9 RPCs pras versões `_fast` no frontend) gerou um deployment de **Produção** com status `success`, criado em `2026-07-28T11:35:03Z`. Ou seja, a partir desse horário, usuários reais pararam de bater nas RPCs antigas lentas de `/respostas`/`/auditoria`.

### 9.2 Evidência de que o banco piorou depois do deploy (não é causado por ele)

Checagem de status pedida pelo usuário logo depois do deploy revelou, todos ativos **na janela de ~11:35 a ~11:55, ou seja, depois do fix estar no ar**:

- `get_logs(postgres)`: rajada quase contínua de `ERROR: canceling statement due to statement timeout` — dezenas de ocorrências por minuto.
- `get_logs(api)`: dezenas de `GET .../funnel_events?...&limit=1` com `status_code: 500` por minuto, além de `POST rpc_campaign_roi` também com 500 — ou seja, RPCs baratas e não relacionadas também estavam falhando, confirmando saturação de CPU generalizada, não um único vilão.
- `cron.job_run_details`: **os dois jobs de cron** (`refresh_funnel_performance_rollups`, o nosso, e `refresh_dashboard_filter_options_mv`, que **não é desta sessão**) passaram a falhar com `job startup timeout` nas rodadas de 11:35, 11:45, 11:50 e 11:55 — sintoma mais grave que timeout de query: o Postgres não conseguia nem *iniciar* o processo do worker do cron. Uma rodada nossa em 11:40 teve sucesso em 0,027s (prova de que o design da seção 4.3 continua correto quando consegue rodar).
- `refresh_dashboard_filter_options_mv` (job **pré-existente, nunca tocado nesta sessão**, faz `REFRESH MATERIALIZED VIEW dashboard_filter_options_mv`) falhou às 11:40 depois de **120,7s**, batendo no mesmo teto de ~2min do mistério da seção 4.2 — evidência de que esse teto afeta qualquer job do `pg_cron`, não só o nosso.
- Chamadas de diagnóstico via MCP (`execute_sql`, `get_advisors`, `apply_migration`) alternavam entre sucesso instantâneo (`select 1`) e `Connection terminated due to connection timeout` — inclusive falhando em ler `pg_stat_activity`, uma operação normalmente trivial.

### 9.3 Causa nova encontrada: query de deduplicação do worker sem índice

Investigando o padrão dominante nos 500s da API (`GET funnel_events?select=event_id&metadata->>lastlink_event_id=eq...&limit=1` — o worker de ingestão checando se um evento do Lastlink já foi inserido antes de gravar), confirmei via `EXPLAIN`:

```
Limit  (cost=0.00..45.82 rows=1 width=16)
  ->  Seq Scan on funnel_events  (cost=0.00..25936.76 rows=566 width=16)
        Filter: ((metadata ->> 'lastlink_event_id'::text) = '...')
```

**Não existe índice pra essa coluna.** Existem índices parciais equivalentes pra `session_id`, `utm_campaign`, `utm_source` (mesmo padrão `(metadata ->> 'chave') WHERE metadata ? 'chave'`), mas `lastlink_event_id` nunca recebeu o mesmo tratamento. O índice GIN genérico em `metadata` (`funnel_events_metadata_gin_idx`) **não acelera esse tipo de busca** — GIN em jsonb serve pra `@>`/`?`/`?&`/`?|`, não pra igualdade de texto via `->>`. Resultado: **cada evento do Lastlink ingerido dispara um seq scan na tabela inteira**, e nos logs de ~2 minutos contei mais de 90 ocorrências desse padrão, todas com 500. `funnel_events` tem só 110.703 linhas / 277 MB — pequena o bastante que isso não deveria ser lento numa instância saudável; o fato de estar sendo é evidência adicional de falta de CPU, não de volume de dados.

**Esta causa é inteiramente nova, nunca esteve no escopo desta sessão** (que era sobre as RPCs de leitura da dashboard, não sobre o caminho de escrita do worker).

### 9.4 Remediação tentada, INCOMPLETA — precisa retomar

Tentei criar o índice faltante:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS funnel_events_lastlink_event_id_idx
ON public.funnel_events ((metadata ->> 'lastlink_event_id'))
WHERE (metadata ? 'lastlink_event_id');
```

- 1ª tentativa via `apply_migration`: falhou antes de começar (`Failed to initialise history table: Connection terminated due to connection timeout`).
- 2ª tentativa via `execute_sql`: a chamada MCP também deu timeout do lado do cliente, **mas o comando continuou rodando no servidor** (confirmado via `pg_stat_activity`, pid vivo). Acompanhado via `pg_stat_progress_create_index`: fase `building index: scanning table`, 1.372 de 24.240 blocos (5,7%) em 83s — ritmo de ~16,5 blocos/s, quando o normal seria completar em segundos. Estimativa na hora: 25-45+ minutos só pra essa passagem.
- **O build morreu no meio do caminho.** Ao checar de novo minutos depois: o processo (pid 1425172) não existe mais em `pg_stat_activity`, `pg_stat_progress_create_index` está vazio, e o índice existe mas com **`indisvalid = false`** — o estado clássico de falha de `CREATE INDEX CONCURRENTLY`.
- Tentei limpar (`DROP INDEX CONCURRENTLY IF EXISTS public.funnel_events_lastlink_event_id_idx`): **também deu timeout**, e as duas tentativas seguintes de checar se o `DROP` continuava rodando no servidor **também deram timeout** (mesmo sendo uma leitura trivial de `pg_stat_activity`). Único comando que respondeu de forma confiável nesse momento: `select 1`.

**Estado exato deixado no banco, precisa ser resolvido antes de qualquer nova tentativa:**

```sql
-- Confirmar primeiro se ainda existe e se está inválido:
select indexname, indisvalid
from pg_indexes i
join pg_class c on c.relname = i.indexname
join pg_index idx on idx.indexrelid = c.oid
where i.tablename = 'funnel_events' and i.indexname = 'funnel_events_lastlink_event_id_idx';

-- Se indisvalid = true (índice quebrado, não confiar nele mesmo que exista):
DROP INDEX CONCURRENTLY IF EXISTS public.funnel_events_lastlink_event_id_idx;

-- Só depois de confirmado limpo, tentar de novo (fora de horário de pico / com o banco mais folgado):
CREATE INDEX CONCURRENTLY IF NOT EXISTS funnel_events_lastlink_event_id_idx
ON public.funnel_events ((metadata ->> 'lastlink_event_id'))
WHERE (metadata ? 'lastlink_event_id');
```

Um índice inválido não é só inofensivo-e-esperando: ele **continua sendo mantido em todo INSERT/UPDATE** (paga o custo de escrita) sem servir pra nenhuma leitura (o planner ignora índices inválidos) — é puro overhead até ser dropado ou reconstruído com sucesso.

### 9.5 Evidência de que o teto é hardware, não configuração

A pedido do usuário ("dá pra paralelizar a CPU?"), consultei `pg_settings`:

| Parâmetro | Valor | Leitura |
|---|---|---|
| `shared_buffers` | ~224 MB | RAM de cache pequena |
| `max_worker_processes` | 6 | Teto de processos em 2º plano pra tudo: autovacuum, cron, workers paralelos, replicação |
| `max_parallel_workers` | 2 | Máx. de workers paralelos ativos na instância inteira |
| `max_parallel_workers_per_gather` | 1 | Uma query só pode pedir 1 worker auxiliar |
| `max_parallel_maintenance_workers` | 1 | `CREATE INDEX`/`VACUUM` só usam 1 worker auxiliar |

Assinatura clássica do tier **Micro** do Supabase (2 vCPUs compartilhados). `pg_cron`, autovacuum, `CREATE INDEX`, e queries paralelas competem pelos mesmos 6 slots — daí o `job startup timeout` da seção 9.2: quando o pool está saturado, processos novos simplesmente não conseguem nascer. Aumentar esses parâmetros via config não resolve — eles só definem um teto de *tentativa*, não criam núcleos físicos novos; subir o teto numa VM com poucos núcleos reais só pioraria a troca de contexto.

**Conclusão sem ambiguidade**: a única forma estrutural de evitar recorrência é upgrade do compute add-on do projeto Supabase (Micro → Small/Medium ou superior, vCPUs dedicados). Decisão de custo/negócio do usuário, não executável por mim.

### 9.6 Temas para estudo aprofundado (pedido explícito do usuário)

Para a pessoa que quiser entender como empresas grandes resolvem esse tipo de problema, os termos exatos a pesquisar, em ordem de relevância:

1. **CQRS (Command Query Responsibility Segregation)** — é o padrão que as rollups desta sessão implementam na prática (separar caminho de escrita do caminho de leitura).
2. **Event Sourcing** — `funnel_events` é um log de eventos append-only; as rollups são projeções derivadas dele. Normalmente estudado junto com CQRS (referências: Greg Young, Martin Fowler).
3. **OLTP/OLAP Workload Isolation via CDC (Change Data Capture)** — o pedaço que falta: grandes empresas não deixam workload transacional e analítico competirem pelo mesmo hardware; replicam via CDC pra um data warehouse separado (ClickHouse, BigQuery, Snowflake, Redshift) ou usam read replicas dedicados.
4. **Database Capacity Planning / Vertical vs. Horizontal Scaling** — o tema-guarda-chuva que explica por que nenhuma otimização de query resolve um teto de hardware.

### 9.7 Pendências desta seção, em ordem

1. **[BLOQUEIA]** Confirmar estado do índice `funnel_events_lastlink_event_id_idx` (válido / inválido / inexistente) e limpar se preciso (comandos na seção 9.4).
2. **[BLOQUEIA]** Recriar o índice com sucesso, de preferência com o banco menos carregado (fora de pico, ou depois de um upgrade de tier).
3. **[NÃO BLOQUEIA]** Investigar se `refresh_dashboard_filter_options_mv` (job pré-existente, seção 9.2) precisa do mesmo tratamento de incremental que demos às rollups de performance — não foi tocado nesta sessão, mas está com o mesmo sintoma de timeout.
4. **[DECISÃO DO USUÁRIO]** Upgrade do compute add-on Supabase — única correção estrutural real pro teto de CPU (seção 9.5).
