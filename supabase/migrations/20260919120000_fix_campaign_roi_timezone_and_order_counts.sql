-- Corrige duas regressões introduzidas por 20260915174949_extend_campaign_roi_upsell02_webinar.sql,
-- identificadas ao cruzar payment_id do dashboard contra o export da Lastlink (15-19/09):
--
-- Bug 1 (timezone): a migração de 15/09 recriou rpc_campaign_roi e
-- rpc_webinar_products_for_campaign para adicionar upsell02/webinário, e no processo reverteu o
-- filtro de data de volta para `event_timestamp::date` (UTC), desfazendo o fix de
-- 20260727200000_fix_america_sao_paulo_date_bucketing.sql. Vendas entre 21:00-23:59:59 BRT
-- (=00:00-02:59:59 UTC do dia seguinte) voltaram a cair no dia errado.
--
-- Bug 2 (contagem não desconta estorno): front_orders/upsell_orders/upsell02_orders/webinar_orders
-- contam só o evento de purchase original, sem subtrair purchase_refunded/purchase_chargeback --
-- diferente das colunas de receita, que já fazem esse netting corretamente. Como a UI
-- (src/pages/campaign-roi.tsx) exibe essas colunas de contagem como "Vendas Front/Upsell/...", o
-- dashboard segue contando vendas já estornadas.
--
-- Ver docs/sessions/2026-09/campaign-roi-timezone-refund-fix.md para o diff completo e o plano de
-- verificação (scripts/verify-timezone-bucketing.sql, scripts/verify-campaign-roi-refunds.sql,
-- scripts/verify-campaign-roi-order-counts.sql).

drop function if exists public.rpc_campaign_roi(text, text, text, date, date, text);

create or replace function public.rpc_campaign_roi(
  p_funnel_id text,
  p_country text,
  p_funnel_variant text,
  p_date_from date,
  p_date_to date,
  p_traffic_source_id text default null
)
returns table (
  traffic_source_id text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  front_revenue_cents bigint,
  upsell_revenue_cents bigint,
  upsell02_revenue_cents bigint,
  webinar_revenue_cents bigint,
  total_revenue_cents bigint,
  reversed_revenue_cents bigint,
  front_orders bigint,
  upsell_orders bigint,
  upsell02_orders bigint,
  webinar_orders bigint,
  unmatched_revenue_cents bigint
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with scoped as (
    select
      coalesce(e.traffic_source_id, public.classify_traffic_source(
        e.metadata->>'utm_source',
        e.metadata->>'fbclid',
        e.metadata->>'ttclid',
        e.metadata->>'gclid',
        e.metadata->>'src',
        e.metadata->>'sck'
      ), 'unknown') as traffic_source_id,
      e.event_type,
      (e.metadata->>'is_upsell')::boolean as is_upsell,
      coalesce((e.metadata->>'price_cents')::bigint, 0) as price_cents,
      coalesce(e.metadata->>'utm_source', 'Sem UTM') as utm_source,
      coalesce(e.metadata->>'utm_campaign', 'Sem campanha') as utm_campaign,
      e.metadata->>'utm_medium' as utm_medium,
      e.metadata->>'attribution_status' as attribution_status
    from public.funnel_events e
    where e.event_type in (
        'purchase',
        'purchase_upsell',
        'purchase_refunded',
        'purchase_chargeback',
        'purchase_upsell_02',
        'purchase_upsell_02_refunded',
        'purchase_upsell_02_chargeback',
        'purchase_webinario',
        'purchase_webinario_refunded',
        'purchase_webinario_chargeback'
      )
      and (e.metadata->>'is_test') is distinct from 'true'
      and (p_funnel_id is null or e.funnel_id = p_funnel_id)
      and (p_country is null or e.country = p_country)
      and (p_funnel_variant is null or e.funnel_variant = p_funnel_variant)
      and (
        p_traffic_source_id is null
        or coalesce(e.traffic_source_id, public.classify_traffic_source(
          e.metadata->>'utm_source',
          e.metadata->>'fbclid',
          e.metadata->>'ttclid',
          e.metadata->>'gclid',
          e.metadata->>'src',
          e.metadata->>'sck'
        ), 'unknown') = p_traffic_source_id
      )
      -- FIX Bug 1: bucketiza no calendário de Brasília, não em UTC (regressão de 20260915174949)
      and (e.event_timestamp at time zone 'America/Sao_Paulo')::date between p_date_from and p_date_to
  )
  select
    traffic_source_id,
    utm_source,
    utm_campaign,
    utm_medium,
    coalesce(sum(price_cents) filter (
      where event_type = 'purchase' and attribution_status is distinct from 'unmatched'
    ), 0)
    - coalesce(sum(price_cents) filter (
      where event_type in ('purchase_refunded', 'purchase_chargeback') and not is_upsell and attribution_status is distinct from 'unmatched'
    ), 0) as front_revenue_cents,
    coalesce(sum(price_cents) filter (
      where event_type = 'purchase_upsell' and attribution_status is distinct from 'unmatched'
    ), 0)
    - coalesce(sum(price_cents) filter (
      where event_type in ('purchase_refunded', 'purchase_chargeback') and is_upsell and attribution_status is distinct from 'unmatched'
    ), 0) as upsell_revenue_cents,
    coalesce(sum(price_cents) filter (
      where event_type = 'purchase_upsell_02' and attribution_status is distinct from 'unmatched'
    ), 0)
    - coalesce(sum(price_cents) filter (
      where event_type in ('purchase_upsell_02_refunded', 'purchase_upsell_02_chargeback') and attribution_status is distinct from 'unmatched'
    ), 0) as upsell02_revenue_cents,
    coalesce(sum(price_cents) filter (
      where event_type = 'purchase_webinario' and attribution_status is distinct from 'unmatched'
    ), 0)
    - coalesce(sum(price_cents) filter (
      where event_type in ('purchase_webinario_refunded', 'purchase_webinario_chargeback') and attribution_status is distinct from 'unmatched'
    ), 0) as webinar_revenue_cents,
    coalesce(sum(price_cents) filter (
      where event_type in ('purchase', 'purchase_upsell', 'purchase_upsell_02', 'purchase_webinario')
        and attribution_status is distinct from 'unmatched'
    ), 0)
    - coalesce(sum(price_cents) filter (
      where event_type in (
        'purchase_refunded', 'purchase_chargeback',
        'purchase_upsell_02_refunded', 'purchase_upsell_02_chargeback',
        'purchase_webinario_refunded', 'purchase_webinario_chargeback'
      )
      and attribution_status is distinct from 'unmatched'
    ), 0) as total_revenue_cents,
    coalesce(sum(price_cents) filter (
      where event_type in (
        'purchase_refunded', 'purchase_chargeback',
        'purchase_upsell_02_refunded', 'purchase_upsell_02_chargeback',
        'purchase_webinario_refunded', 'purchase_webinario_chargeback'
      )
      and attribution_status is distinct from 'unmatched'
    ), 0) as reversed_revenue_cents,
    -- FIX Bug 2: descontar refund/chargeback das contagens, igual já é feito na receita
    greatest(0,
      coalesce(count(*) filter (where event_type = 'purchase' and attribution_status is distinct from 'unmatched'), 0)
      - coalesce(count(*) filter (where event_type in ('purchase_refunded', 'purchase_chargeback') and not is_upsell and attribution_status is distinct from 'unmatched'), 0)
    ) as front_orders,
    greatest(0,
      coalesce(count(*) filter (where event_type = 'purchase_upsell' and attribution_status is distinct from 'unmatched'), 0)
      - coalesce(count(*) filter (where event_type in ('purchase_refunded', 'purchase_chargeback') and is_upsell and attribution_status is distinct from 'unmatched'), 0)
    ) as upsell_orders,
    greatest(0,
      coalesce(count(*) filter (where event_type = 'purchase_upsell_02' and attribution_status is distinct from 'unmatched'), 0)
      - coalesce(count(*) filter (where event_type in ('purchase_upsell_02_refunded', 'purchase_upsell_02_chargeback') and attribution_status is distinct from 'unmatched'), 0)
    ) as upsell02_orders,
    greatest(0,
      coalesce(count(*) filter (where event_type = 'purchase_webinario' and attribution_status is distinct from 'unmatched'), 0)
      - coalesce(count(*) filter (where event_type in ('purchase_webinario_refunded', 'purchase_webinario_chargeback') and attribution_status is distinct from 'unmatched'), 0)
    ) as webinar_orders,
    coalesce(sum(price_cents) filter (where attribution_status = 'unmatched'), 0) as unmatched_revenue_cents
  from scoped
  group by traffic_source_id, utm_source, utm_campaign, utm_medium
  order by total_revenue_cents desc;
$$;

grant execute on function public.rpc_campaign_roi(text, text, text, date, date, text) to anon, authenticated;

drop function if exists public.rpc_webinar_products_for_campaign(text, text, text, text, text, text, date, date, text);

create or replace function public.rpc_webinar_products_for_campaign(
  p_funnel_id text,
  p_country text,
  p_funnel_variant text,
  p_utm_source text,
  p_utm_campaign text,
  p_utm_medium text,
  p_date_from date,
  p_date_to date,
  p_traffic_source_id text default null
)
returns table (
  product_code text,
  product_name text,
  purchase_count bigint,
  gross_revenue_cents bigint
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    coalesce(nullif(e.metadata->>'product_code', ''), 'desconhecido') as product_code,
    coalesce(nullif(e.metadata->>'product_name', ''), 'Produto sem nome') as product_name,
    count(*) filter (where e.event_type = 'purchase_webinario') as purchase_count,
    coalesce(sum((e.metadata->>'price_cents')::bigint) filter (where e.event_type = 'purchase_webinario'), 0) as gross_revenue_cents
  from public.funnel_events e
  where e.event_type like 'purchase_webinario%'
    and (e.metadata->>'is_test') is distinct from 'true'
    and (e.metadata->>'attribution_status') is distinct from 'unmatched'
    and (p_funnel_id is null or e.funnel_id = p_funnel_id)
    and (p_country is null or e.country = p_country)
    and (p_funnel_variant is null or e.funnel_variant = p_funnel_variant)
    and coalesce(e.metadata->>'utm_source', 'Sem UTM') = p_utm_source
    and coalesce(e.metadata->>'utm_campaign', 'Sem campanha') = p_utm_campaign
    and coalesce(e.metadata->>'utm_medium', '') = coalesce(p_utm_medium, '')
    and (
      p_traffic_source_id is null
      or coalesce(e.traffic_source_id, public.classify_traffic_source(
        e.metadata->>'utm_source',
        e.metadata->>'fbclid',
        e.metadata->>'ttclid',
        e.metadata->>'gclid',
        e.metadata->>'src',
        e.metadata->>'sck'
      ), 'unknown') = p_traffic_source_id
    )
    -- FIX Bug 1: mesmo bucketing por America/Sao_Paulo
    and (e.event_timestamp at time zone 'America/Sao_Paulo')::date between p_date_from and p_date_to
  group by 1, 2
  having count(*) filter (where e.event_type = 'purchase_webinario') > 0
  order by gross_revenue_cents desc, purchase_count desc, product_name asc;
$$;

grant execute on function public.rpc_webinar_products_for_campaign(text, text, text, text, text, text, date, date, text) to anon, authenticated;
