-- Verifica, contra dados reais de produção/staging, que rpc_campaign_roi() desconta
-- refund/chargeback das colunas de CONTAGEM (front_orders/upsell_orders/...), não só da receita.
--
-- Uso: rodar via Supabase SQL editor / MCP execute_sql após aplicar
-- supabase/migrations/20260919120000_fix_campaign_roi_timezone_and_order_counts.sql.
-- Critério de aceite (Bug 2 do relatório de 2026-09-19): as colunas "via_raw_aggregate" e
-- "via_rpc" devem ser idênticas para todo o período auditado.

with raw_counts as (
  -- Agregação independente: purchase aprovado menos refund/chargeback batido, direto de
  -- funnel_events -- não reaproveita nenhuma CTE de rpc_campaign_roi.
  select
    coalesce(e.traffic_source_id, public.classify_traffic_source(
      e.metadata->>'utm_source', e.metadata->>'fbclid', e.metadata->>'ttclid',
      e.metadata->>'gclid', e.metadata->>'src', e.metadata->>'sck'
    ), 'unknown') as traffic_source_id,
    coalesce(e.metadata->>'utm_source', 'Sem UTM') as utm_source,
    coalesce(e.metadata->>'utm_campaign', 'Sem campanha') as utm_campaign,
    e.metadata->>'utm_medium' as utm_medium,
    greatest(0,
      count(*) filter (
        where e.event_type = 'purchase' and (e.metadata->>'attribution_status') is distinct from 'unmatched'
      )
      - count(*) filter (
        where e.event_type in ('purchase_refunded', 'purchase_chargeback')
          and (e.metadata->>'is_upsell')::boolean is not true
          and (e.metadata->>'attribution_status') is distinct from 'unmatched'
      )
    ) as front_orders_raw
  from public.funnel_events e
  where e.event_type in ('purchase', 'purchase_refunded', 'purchase_chargeback')
    and (e.metadata->>'is_test') is distinct from 'true'
    and (e.event_timestamp at time zone 'America/Sao_Paulo')::date between '2026-09-15' and '2026-09-19'
  group by 1, 2, 3, 4
),
via_rpc as (
  select traffic_source_id, utm_source, utm_campaign, utm_medium, front_orders
  from public.rpc_campaign_roi(null, null, null, '2026-09-15', '2026-09-19', null)
)
select
  coalesce(r.traffic_source_id, v.traffic_source_id) as traffic_source_id,
  coalesce(r.utm_campaign, v.utm_campaign) as utm_campaign,
  r.front_orders_raw as via_raw_aggregate,
  v.front_orders as via_rpc,
  (coalesce(r.front_orders_raw, 0) = coalesce(v.front_orders, 0)) as matches
from raw_counts r
full outer join via_rpc v
  on v.traffic_source_id = r.traffic_source_id
  and v.utm_source = r.utm_source
  and v.utm_campaign = r.utm_campaign
  and v.utm_medium is not distinct from r.utm_medium
order by via_raw_aggregate desc nulls last;
