-- Auditoria do Problema 04 (horário dos eventos) contra dados reais de produção.
-- Roda via Supabase SQL editor / MCP execute_sql (tabela funnel_events só é legível por
-- authenticated/service_role, por isso este é um script SQL e não um script Node com a
-- chave anon do dashboard).
--
-- Critério de aceite: nenhuma linha deve "sumir" ou duplicar depois da migração de fuso
-- (query 1), e eventos perto da virada da meia-noite BRT devem cair no dia de Brasília
-- correto, não no dia UTC (query 2).

-- 1) Sanity de integridade: a view não pode perder/duplicar linhas.
select
  (select count(*) from public.funnel_events where (metadata->>'is_test') is distinct from 'true') as raw_count,
  (select count(*) from public.funnel_events_flat_view) as view_count,
  (
    (select count(*) from public.funnel_events where (metadata->>'is_test') is distinct from 'true')
    = (select count(*) from public.funnel_events_flat_view)
  ) as counts_match;

-- 2) Boundary check: eventos entre 21:00-23:59:59 BRT do dia anterior (= 00:00-02:59:59 UTC
-- do dia seguinte) devem ficar no event_date de Brasília, não no dia UTC.
-- Exemplo fixado em 2026-07-25/26: eventos com event_timestamp entre
-- 2026-07-26 00:00 UTC e 2026-07-26 02:59:59 UTC são, na verdade, 2026-07-25 21:00-23:59:59
-- BRT -- devem aparecer com event_date = 2026-07-25, nunca 2026-07-26.
select
  event_date,
  count(*) as eventos,
  min(event_timestamp) as first_ts,
  max(event_timestamp) as last_ts,
  bool_and(event_date = '2026-07-25') as todos_no_dia_brt_correto
from public.funnel_events_flat_view
where event_timestamp >= '2026-07-26 00:00:00+00' and event_timestamp < '2026-07-26 03:00:00+00'
group by event_date
order by event_date;
