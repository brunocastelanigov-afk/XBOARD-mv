# Incidente de Contenção de CPU — Instância Supabase (2026-07-28)

> **Status: ATIVO, NÃO RESOLVIDO.** Este documento é focado exclusivamente no problema de capacidade de CPU da instância Supabase — não cobre o trabalho de otimização de RPCs da dashboard (ver `2026-07-28-handoff-completo.md` pra isso, especialmente a seção 9, de onde este documento foi extraído e aprofundado). Leia este arquivo sozinho, sem precisar do outro, se o assunto for só CPU/capacidade.

---

## 1. Resumo executivo

A instância Supabase do projeto (`zcaypxqrteoedzbdmagm`) está, neste momento, operando sob **contenção de CPU real e mensurável**, ao ponto de:

- `pg_cron` falhar em **iniciar** jobs agendados (não só em terminá-los a tempo).
- Uma varredura sequencial (`Seq Scan`) numa tabela de 277 MB **100% em cache** (zero I/O de disco) levar **2,24 segundos** — fisicamente incompatível com I/O ou falta de índice, só explicável por fila de espera de CPU.
- A criação de um índice (`CREATE INDEX CONCURRENTLY`) numa tabela pequena (110 mil linhas) **morrer no meio do processo**, sem completar.
- Chamadas de diagnóstico triviais (`select 1`, leitura de `pg_stat_activity`) alternarem entre resposta instantânea e timeout de conexão, de forma imprevisível.

A causa não é nenhuma query específica mal escrita — é **capacidade de hardware insuficiente pra soma da carga atual**: `pg_cron` (dois jobs a cada 5 min), o worker de ingestão de eventos (escritas contínuas + uma query de deduplicação sem índice), tráfego real de usuários, e o crescimento de escala do produto (tabela principal dobrou de tamanho — 152MB→277MB — durante uma única sessão de trabalho).

---

## 2. Linha do tempo da evidência

| Quando (UTC) | Evento |
|---|---|
| ~09:25 | `pg_cron` já estava falhando silenciosamente havia horas (achado numa investigação anterior, não coberta aqui — ver handoff completo seção 4). |
| 11:35:03 | Deploy de produção (Vercel, commit `9540d35`) troca o frontend pras RPCs otimizadas (`_fast`) — usuários reais param de bater nas RPCs antigas lentas de `/respostas`/`/auditoria`. |
| 11:35–11:55 | Apesar do deploy, `pg_cron` continua falhando — mas agora com um sintoma **mais grave** (`job startup timeout`, não apenas timeout de query). Ver seção 3. |
| ~11:52–11:54 | Rajada de dezenas de `ERROR: canceling statement due to statement timeout` por minuto nos logs do Postgres, e dezenas de HTTP 500 por minuto nos logs da API, em endpoints não relacionados entre si. |
| 11:5x | Tentativa de correção (índice novo) morre no meio da construção. Ver seção 5. |

---

## 3. Evidência #1 — `pg_cron` não consegue nem iniciar

```
jobid | job                                  | start_time (UTC)     | status  | return_message
------+--------------------------------------+-----------------------+---------+----------------------
2     | refresh_funnel_performance_rollups    | 2026-07-28 11:55:00   | failed  | job startup timeout
1     | refresh_dashboard_filter_options_mv   | 2026-07-28 11:55:00   | failed  | job startup timeout
2     | refresh_funnel_performance_rollups    | 2026-07-28 11:50:00   | failed  | job startup timeout
1     | refresh_dashboard_filter_options_mv   | 2026-07-28 11:50:00   | failed  | job startup timeout
2     | refresh_funnel_performance_rollups    | 2026-07-28 11:45:00   | failed  | job startup timeout
1     | refresh_dashboard_filter_options_mv   | 2026-07-28 11:45:00   | failed  | job startup timeout
1     | refresh_dashboard_filter_options_mv   | 2026-07-28 11:40:00   | failed  | statement timeout (120,7s)
2     | refresh_funnel_performance_rollups    | 2026-07-28 11:40:00   | success | 0,027s
```

**Leitura**: quando o job `refresh_funnel_performance_rollups` (desenhado nesta sessão pra processar só o delta incremental, ver handoff completo seção 4.3) consegue rodar, é rápido — 27ms. O problema não é o design da query, é que o Postgres frequentemente **não consegue nem alocar um processo pra rodar o job**. `job startup timeout` é categoricamente diferente de "query lenta": significa que não havia slot de processo disponível pro `pg_cron` lançar o worker.

`refresh_dashboard_filter_options_mv` é um job **pré-existente, nunca tocado nesta sessão** (faz `REFRESH MATERIALIZED VIEW`) — está com o mesmo sintoma, confirmando que o problema é da instância como um todo, não de uma função específica.

---

## 4. Evidência #2 — seq scan em cache, ainda assim lento (contenção de CPU pura)

De uma investigação anterior na mesma sessão, mantida aqui por ser a prova mais direta de contenção de CPU (isolando I/O como possível causa):

```
Seq Scan on funnel_lead_profile_rollup pr (actual time=0.033..2244.065 rows=12068)
  Buffers: shared hit=323   -- 100% cache hit, zero leitura de disco
```

2,24 segundos pra escanear 323 páginas **já em memória** não pode ser explicado por I/O lento ou falta de índice (não tem I/O envolvido). A única explicação fisicamente possível é o processo ficando **na fila esperando sua vez de usar a CPU**.

Nova evidência, coletada durante este incidente, do mesmo padrão:

```sql
explain (format text)
select event_id from public.funnel_events
where metadata ->> 'lastlink_event_id' = '...'
limit 1;

-- Seq Scan on funnel_events (cost=0.00..25936.76 rows=566 width=16)
--   Filter: ((metadata ->> 'lastlink_event_id'::text) = '...')
```

Esse plano roda **centenas de vezes por hora** (é a query de deduplicação do worker de ingestão do Lastlink — ver seção 6) numa tabela de só 110.703 linhas / 277 MB. Rodar `EXPLAIN ANALYZE` (que executa de verdade) nessa mesma query **deu timeout de conexão** — não completou dentro do limite da ferramenta de diagnóstico. Numa instância saudável, isso levaria uma fração de segundo.

---

## 5. Evidência #3 — a própria tentativa de correção falhou por falta de CPU

Tentei criar o índice que resolveria a causa da seção 6:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS funnel_events_lastlink_event_id_idx
ON public.funnel_events ((metadata ->> 'lastlink_event_id'))
WHERE (metadata ? 'lastlink_event_id');
```

- Primeira tentativa (via ferramenta de migração): falhou antes de começar — nem a tabela de histórico de migrações conseguiu ser inicializada (timeout de conexão).
- Segunda tentativa: a chamada da ferramenta deu timeout do lado do cliente, mas o comando **continuou rodando no servidor** (confirmado via `pg_stat_activity`). Acompanhado via `pg_stat_progress_create_index`:

  ```
  fase: building index: scanning table
  blocos: 1.372 / 24.240 (5,7%)
  tempo decorrido: 83s
  ```

  Ritmo: ~16,5 blocos/segundo. Numa instância saudável, essa fase leva segundos, não minutos. Na taxa observada, só essa passagem levaria 25-45+ minutos (e `CONCURRENTLY` ainda precisa de uma segunda passagem de validação depois).

- **O processo morreu antes de terminar.** Checagem alguns minutos depois: o pid não existe mais em `pg_stat_activity`, não há build em progresso, e o índice existe mas com `indisvalid = false` — o estado de falha padrão de `CREATE INDEX CONCURRENTLY`.
- Tentativa de limpar (`DROP INDEX CONCURRENTLY`) **também** deu timeout, e as duas checagens seguintes pra saber se o `DROP` continuava rodando **também** deram timeout — mesmo sendo leitura trivial de `pg_stat_activity`. Só `select 1` respondeu de forma confiável nesse momento.

**A correção do problema de CPU foi, ela mesma, impedida pela falta de CPU.** É a demonstração mais direta possível de que isso não é resolvível por ajuste de query — o ambiente não tem recursos sobrando nem pra manutenção básica.

### Estado exato deixado no banco — retomar por aqui

```sql
-- 1. Confirmar estado atual
select indexname, indisvalid
from pg_indexes i
join pg_class c on c.relname = i.indexname
join pg_index idx on idx.indexrelid = c.oid
where i.tablename = 'funnel_events' and i.indexname = 'funnel_events_lastlink_event_id_idx';

-- 2. Se indisvalid = true (índice quebrado — não confiar nele mesmo que exista):
DROP INDEX CONCURRENTLY IF EXISTS public.funnel_events_lastlink_event_id_idx;

-- 3. Só depois de confirmado limpo, e de preferência com o banco mais folgado
--    (fora de pico, ou já com tier de compute maior):
CREATE INDEX CONCURRENTLY IF NOT EXISTS funnel_events_lastlink_event_id_idx
ON public.funnel_events ((metadata ->> 'lastlink_event_id'))
WHERE (metadata ? 'lastlink_event_id');
```

**Importante**: um índice `indisvalid = false` não é neutro enquanto não for limpo — ele continua sendo **atualizado em todo INSERT/UPDATE** (paga o custo de escrita normalmente) mas é **ignorado pelo planner em toda leitura** (não serve pra nada). É puro overhead até ser dropado ou reconstruído com sucesso.

---

## 6. Causa concreta identificada: query de deduplicação do worker sem índice

O padrão dominante nos erros 500 da API durante o incidente era:

```
GET /rest/v1/funnel_events?select=event_id&metadata->>lastlink_event_id=eq.<uuid>&limit=1
```

Esta é a checagem de deduplicação que o worker de ingestão roda **a cada evento recebido do Lastlink**, antes de gravar, pra evitar duplicata. Em ~2 minutos de log, mais de 90 ocorrências desse padrão exato, todas com 500.

A tabela `funnel_events` já tem índices parciais equivalentes pra outras chaves de `metadata` (`session_id`, `utm_campaign`, `utm_source`), mas **nunca recebeu um pra `lastlink_event_id`**. O índice GIN genérico existente em `metadata` não acelera esse tipo de busca (GIN serve pra `@>`/`?`/`?&`/`?|`, não pra igualdade de texto via `->>`). Resultado: cada checagem de dedup faz um `Seq Scan` na tabela inteira.

Esta causa é **nova e nunca esteve no escopo do trabalho de otimização de RPCs desta sessão** — está no caminho de escrita (worker), não no caminho de leitura (dashboard).

---

## 7. Por que não dá pra resolver só com configuração

A pedido explícito de investigação, consultei `pg_settings`:

| Parâmetro | Valor atual | Significado |
|---|---|---|
| `shared_buffers` | ~224 MB | Cache de memória do Postgres — pequeno |
| `max_worker_processes` | **6** | Teto de processos em 2º plano pra tudo: autovacuum, `pg_cron`, workers paralelos, replicação — todos dividindo o mesmo pool |
| `max_parallel_workers` | **2** | Máximo de workers paralelos ativos na instância inteira, em qualquer momento |
| `max_parallel_workers_per_gather` | **1** | Uma única query só pode pedir 1 worker auxiliar |
| `max_parallel_maintenance_workers` | **1** | `CREATE INDEX`/`VACUUM` só podem usar 1 worker auxiliar |

Esses números são a assinatura do tier **Micro** do Supabase (2 vCPUs compartilhados). `pg_cron`, autovacuum, criação de índice e queries paralelas competem pelos mesmos 6 slots de processo — é exatamente por isso que jobs começaram a falhar com `job startup timeout` (seção 3): quando o pool está saturado, processos novos simplesmente não conseguem nascer.

Subir esses parâmetros via configuração **não resolve**: eles definem um teto do que o Postgres *tenta* fazer, não criam núcleos de CPU físicos novos. Numa VM com poucos núcleos reais, um teto mais alto só faz mais processos competirem pelos mesmos núcleos, piorando a troca de contexto em vez de ajudar.

**Conclusão sem ambiguidade**: a única correção estrutural real é aumentar o **compute add-on** do projeto Supabase (Micro → Small/Medium ou superior — vCPUs dedicados, não compartilhados). É uma decisão de custo/negócio, não uma tarefa de código.

---

## 8. Temas para estudo aprofundado (como empresas grandes resolvem isso)

Em ordem de relevância pro que estamos vivendo:

1. **CQRS (Command Query Responsibility Segregation)** — as tabelas de rollup criadas nesta sessão (ver handoff completo, seções 2 e 4) já são uma aplicação prática desse padrão: separar o caminho de escrita (`funnel_events` bruto) do caminho de leitura (tabelas pré-agregadas).
2. **Event Sourcing** — `funnel_events` é um log de eventos append-only; as rollups são projeções/read models derivados dele. Normalmente estudado junto com CQRS (referências clássicas: Greg Young, Martin Fowler).
3. **OLTP/OLAP Workload Isolation via CDC (Change Data Capture)** — o pedaço que ainda falta nesta arquitetura: empresas grandes não deixam workload transacional (escritas do worker, leituras da dashboard) e workload analítico (agregações pesadas) competirem pelo mesmo hardware. Replicam via CDC pra um data warehouse separado (ClickHouse, BigQuery, Snowflake, Redshift) ou usam read replicas dedicados a relatórios.
4. **Database Capacity Planning / Vertical vs. Horizontal Scaling** — o tema-guarda-chuva que explica por que nenhuma otimização de query, por melhor que seja, resolve um teto de hardware — e quando faz sentido trocar de máquina (vertical) versus distribuir a carga entre várias (horizontal).

---

## 9. Pendências, em ordem

1. **[BLOQUEIA tudo abaixo]** Confirmar estado do índice `funnel_events_lastlink_event_id_idx` (válido / inválido / inexistente) e limpar se necessário — comandos prontos na seção 5.
2. **[BLOQUEIA a correção da causa da seção 6]** Recriar o índice com sucesso — de preferência fora de horário de pico, ou já com um tier de compute maior.
3. **[NÃO BLOQUEIA]** Avaliar se `refresh_dashboard_filter_options_mv` (job pré-existente, seção 3) precisa do mesmo tratamento incremental dado às rollups de performance nesta sessão — está com o mesmo sintoma de timeout, mas nunca foi investigado a fundo.
4. **[DECISÃO DO USUÁRIO, NÃO EXECUTÁVEL POR CÓDIGO]** Upgrade do compute add-on do projeto Supabase — única correção estrutural real pro teto de CPU (seção 7).
