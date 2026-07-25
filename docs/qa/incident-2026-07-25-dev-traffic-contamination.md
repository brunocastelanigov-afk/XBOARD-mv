# Incidente: contaminação de dados reais por tráfego de desenvolvimento

**Data:** 2026-07-25
**Reportado por:** stakeholder, via a página "Respostas do Funil" mostrando taxas de passagem impossíveis (etapa 1: 100%, etapa 2: 66%, etapa 3: 47%, etapa 4: 89% — subindo entre etapas, o que não pode acontecer num funil sequencial).
**Não relacionado às Stories 1.1-1.4** — root cause é anterior e independente de qualquer uma delas.

## Causa raiz

**2.648 de ~3.295 linhas (80%) de `funnel_events` para o funil `desafio_treino_trinca` vinham de origens de desenvolvimento local** (`http://localhost:*`, `http://127.0.0.1:*`), acumuladas desde `2026-07-16` até `2026-07-24`, por múltiplas sessões de dev/teste (portas 5173, 4173, 4174, 5175, 5183 — várias ferramentas/sessões diferentes ao longo de mais de uma semana) que escreveram diretamente no worker de **produção** em vez de um ambiente local/staging.

`funnel_events_flat_view` — a view base usada por `rpc_step_results`, `rpc_performance`, `rpc_lead_audit*`, `rpc_lead_responses*`, `rpc_campaign_performance` e `rpc_device_performance` — **nunca filtrou `is_test` nem origem de dev**, ao contrário das RPCs mais novas (`rpc_campaign_roi` etc., desde a Story 1.1), que já excluem `is_test=true` por padrão.

No caso específico reportado: no dia `2026-07-24`, a etapa 4 ("Queime gordura e ganhe músculos rapidamente!") tinha 42 leads distintos com `page_view`, dos quais **20 nunca tiveram um evento de etapa 3** — chegaram direto na etapa 4 via origem `http://127.0.0.1:4174/bridge`, uma rota de teste que não existe pra usuários reais. Isso inflava artificialmente o "entries" da etapa 4 acima da etapa 3, e o cálculo client-side de `uniqueSteps()` em `respostas.tsx` (que escolhe, por etapa, o dia com mais `entries`) amplificava a inconsistência visualmente.

## Correção aplicada (produção, `zcaypxqrteoedzbdmagm`)

Migration `dashboard/supabase/migrations/20260725020000_exclude_dev_traffic_from_analytics.sql`:

1. **Tag retroativa, não deleção**: as 2.648 linhas com `metadata.origin`/`metadata.page_url` batendo em `localhost`/`127.0.0.1` foram marcadas com `metadata.is_test = true` (+ `is_test_reason` para rastreabilidade). Nenhuma linha foi apagada — totalmente reversível.
2. `funnel_events_flat_view` recriada para excluir `metadata->>'is_test' = 'true'`, alinhando com o padrão já usado no restante do projeto. Como todas as views/RPCs afetadas (`funnel_step_results_view`, `funnel_performance_view`, `funnel_lead_audit_view`, `funnel_lead_responses_view`, `funnel_campaign_performance_view`, `funnel_device_performance_view`) já dependem dessa view base, um único ponto de correção resolveu todas de uma vez (confirmado via `information_schema.views`).
3. `security_invoker = true` adicionado à view (achado extra do `get_advisors` depois da recriação — a view original já não tinha essa opção, não é uma regressão desta correção).

`rpc_campaign_roi`/`rpc_dashboard_filter_options` (Stories 1.1-1.4) não foram afetadas — já tinham seu próprio filtro `is_test` desde a criação, consultam `funnel_events` diretamente, não passam por essa view.

## Verificação

Antes (07-24, view antiga): `entries` por etapa = 47, 31, 22, **42**, 11 — etapa 4 maior que etapa 3, impossível.

Depois (mesma data, view corrigida): `entries` = 8, 3, 3, 3, 3, 3 — monotonicamente não-crescente, consistente com um funil real (volume real de tráfego é baixo, mas agora coerente).

`get_advisors(security)` checado antes/depois: nenhum novo warning introduzido pela correção; `security_definer_view` (achado incidental) resolvido junto.

## Pendências / recomendações

- **Causa raiz de infraestrutura não corrigida nesta sessão**: alguém precisa investigar por que `VITE_FUNNEL_WORKER_URL` (ou equivalente) em ambientes de desenvolvimento local está apontando para o worker de produção em vez de um worker local (`wrangler dev`) ou staging. Sem isso, a contaminação **vai continuar acontecendo** a cada nova sessão de desenvolvimento/teste local do funil.
- Considerar adicionar ao próprio worker uma proteção adicional: recusar ou marcar automaticamente como `is_test=true` qualquer evento cujo `Origin` bata em `localhost`/`127.0.0.1`, em vez de depender de correção retroativa no banco.
- O `uniqueSteps()` em `dashboard/src/pages/respostas.tsx` (escolhe, por etapa, o dia com mais `entries`, em vez de agregar de fato o período selecionado) continua sendo um design frágil — funcionou aqui porque os dados agora são coerentes, mas pode voltar a produzir leituras estranhas se o tráfego real tiver picos desiguais por dia entre etapas. Não foi alterado nesta correção (fora do escopo do que foi pedido), mas fica registrado como débito técnico.
