-- Verifica, contra dados reais de produção, que rpc_campaign_roi() atribui reembolsos e
-- chargebacks à campanha correta e que a receita líquida bate com uma agregação independente
-- feita diretamente sobre funnel_events (sem reusar a query da própria função).
--
-- Uso: rodar via Supabase SQL editor / MCP execute_sql contra o projeto de produção.
-- Critério de aceite (Problema 01): as duas colunas "via_rpc" e "via_raw_aggregate" devem ser
-- idênticas para todo o período auditado; e o total de eventos de reembolso/chargeback batidos
-- (matched) deve corresponder ao total agregado por rpc_campaign_roi.

with raw_reversals as (
  -- Agregação independente: reembolsos/chargebacks batidos (attribution_status <> 'unmatched'),
  -- por campanha, direto de funnel_events -- não reaproveita nenhuma CTE de rpc_campaign_roi.
  select
    coalesce(e.traffic_source_id, public.classify_traffic_source(
      e.metadata->>'utm_source', e.metadata->>'fbclid', e.metadata->>'ttclid',
      e.metadata->>'gclid', e.metadata->>'src', e.metadata->>'sck'
    ), 'unknown') as traffic_source_id,
    coalesce(e.metadata->>'utm_source', 'Sem UTM') as utm_source,
    coalesce(e.metadata->>'utm_campaign', 'Sem campanha') as utm_campaign,
    e.metadata->>'utm_medium' as utm_medium,
    sum(coalesce((e.metadata->>'price_cents')::bigint, 0)) as reversed_revenue_cents_raw
  from public.funnel_events e
  where e.event_type in ('purchase_refunded', 'purchase_chargeback')
    and (e.metadata->>'is_test') is distinct from 'true'
    and (e.metadata->>'attribution_status') is distinct from 'unmatched'
    and (e.event_timestamp at time zone 'America/Sao_Paulo')::date between '2026-07-24' and '2026-07-27'
  group by 1, 2, 3, 4
),
via_rpc as (
  select traffic_source_id, utm_source, utm_campaign, utm_medium, reversed_revenue_cents
  from public.rpc_campaign_roi(null, null, null, '2026-07-24', '2026-07-27', null)
)
select
  coalesce(r.traffic_source_id, v.traffic_source_id) as traffic_source_id,
  coalesce(r.utm_campaign, v.utm_campaign) as utm_campaign,
  r.reversed_revenue_cents_raw as via_raw_aggregate,
  v.reversed_revenue_cents as via_rpc,
  (coalesce(r.reversed_revenue_cents_raw, 0) = coalesce(v.reversed_revenue_cents, 0)) as matches
from raw_reversals r
full outer join via_rpc v
  on v.traffic_source_id = r.traffic_source_id
  and v.utm_source = r.utm_source
  and v.utm_campaign = r.utm_campaign
  and v.utm_medium is not distinct from r.utm_medium
order by via_raw_aggregate desc nulls last;
