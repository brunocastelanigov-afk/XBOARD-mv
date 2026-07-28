-- Corrige dashboard_filter_options_mv.leads pra usar o MESMO filtro de event_type que
-- rpc_dashboard_filter_options() já usa hoje (page_view, page_avance, button_click,
-- data_collected, vturb_start, checkout_start) — não count(distinct lead_id) puro.
--
-- Achado ao validar a migração anterior contra a query ao vivo: sem o filtro, linhas de
-- funnel_variant "inlead" e funnel_id "unmatched" (leads que só têm evento de compra via
-- Lastlink — Data.Utm sem Vtid, ou Vtid que não bateu com nenhum checkout_start — nunca um
-- evento de progressão do funil interno) inflavam "leads" de 0 para milhares (ex.: 6982 pra
-- facebook/inlead). Comparação linha a linha contra a query do RPC atual confirmou 0
-- divergências depois desta correção (raw_rows=10, mv_rows=10, mismatched_rows=0).
drop materialized view if exists public.dashboard_filter_options_mv;

create materialized view public.dashboard_filter_options_mv as
  select
    funnel_id,
    country,
    funnel_variant,
    traffic_source_id,
    min(event_date) as min_event_date,
    max(event_date) as max_event_date,
    count(distinct lead_id) filter (
      where event_type in ('page_view', 'page_avance', 'button_click', 'data_collected', 'vturb_start', 'checkout_start')
    )::integer as leads
  from funnel_events_flat_view
  group by funnel_id, country, funnel_variant, traffic_source_id
with data;

create unique index dashboard_filter_options_mv_uq
  on public.dashboard_filter_options_mv (funnel_id, country, coalesce(funnel_variant, ''::text), traffic_source_id);
