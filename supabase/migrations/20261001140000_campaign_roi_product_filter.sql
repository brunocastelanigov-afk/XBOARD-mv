-- Filtro de "Produto" no ROI de Campanhas: separa o front Treino Trinca do Treino Trinca Pink.
--
-- Como o produto é atribuído a cada evento (nesta ordem):
--   1. Pelo código do próprio evento (metadata.product_id, ou metadata.product_code no upsell 02):
--      front, upsell/Elite e upsell 02 já trazem o produto -> public.campaign_product_slug().
--   2. Reembolso/chargeback do front/upsell NÃO trazem produto -> herdam da compra original,
--      localizada por payment_id (índice parcial funnel_events_payment_id_idx).
--   3. Webinário (Payt) é vendido para os dois públicos e o código dele não identifica o front ->
--      herda o produto da venda front mais recente do mesmo buyer_email
--      (índice parcial funnel_events_buyer_email_idx). Sem venda front casada, o evento só
--      aparece em "Todos os produtos".
--
-- Os lookups (2) e (3) são CTEs sobre o conjunto pequeno de reembolsos/webinários do período e só
--
-- Compatibilidade: p_product entra no fim com default null, então o frontend antigo (que chama
-- com 6 parâmetros nomeados) continua funcionando até o deploy do novo.
--
-- Para cadastrar um produto novo, basta incluí-lo em campaign_product_slug().

create or replace function public.campaign_product_slug(p_code text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_code in (
      'ae6ef3ee-3cff-4064-a0d7-0dcf31707b10', -- Desafio Treino Trinca (front)
      '0ca58092-d29c-491b-a581-96cc5290f031', -- Desafio Treino Trinca. (front)
      '3afc8063-0bb9-4f1d-a2d3-7d69a976bda4', -- Comunidade Trinca Elite
      'ffa020d9-cb3b-48dd-bad5-8f74873ee5c3', -- Protocolo Alimentar (Upsell 02)
      'prod_1'                                -- Order bump
    ) then 'treino-trinca'
    when p_code in (
      'a707cd16-af6a-4948-9c0f-375702990c6d', -- Desafio Treino Trinca | Pink (front)
      'db7ce538-547f-499d-a9ba-fbc0cccbd919', -- Comunidade Trinca Elite | Pink
      '54c83b88-97a7-49bb-83af-92614fa9f330'  -- Protocolo Alimentar Pink (Upsell 02)
    ) then 'treino-trinca-pink'
    else null
  end;
$$;

grant execute on function public.campaign_product_slug(text) to anon, authenticated;

drop function if exists public.rpc_campaign_roi(text, text, text, date, date, text);

create or replace function public.rpc_campaign_roi(
  p_funnel_id text,
  p_country text,
  p_funnel_variant text,
  p_date_from date,
  p_date_to date,
  p_traffic_source_id text default null,
  p_product text default null
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
  with base as (
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
      e.metadata->>'attribution_status' as attribution_status,
      e.metadata->>'payment_id' as payment_id,
      e.metadata->>'buyer_email' as buyer_email,
      public.campaign_product_slug(coalesce(e.metadata->>'product_id', e.metadata->>'product_code')) as own_slug
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
      and (e.event_timestamp at time zone 'America/Sao_Paulo')::date between p_date_from and p_date_to
  ),
  -- Origem dos reembolsos/chargebacks do front e upsell (sem produto no evento): compra original por payment_id.
  -- `= any(array(...))` (e não `in (subselect)`) faz o planner usar o índice parcial funnel_events_payment_id_idx
  -- em vez de seq scan da tabela inteira (3,6 s -> 38 ms medido em produção).
  refund_origin as materialized (
    select distinct on (o.metadata->>'payment_id')
      o.metadata->>'payment_id' as payment_id,
      public.campaign_product_slug(o.metadata->>'product_id') as slug
    from public.funnel_events o
    where p_product is not null
      and o.event_type in ('purchase', 'purchase_upsell')
      and o.metadata->>'payment_id' = any(array(
        select b.payment_id from base b
        where b.own_slug is null and b.event_type in ('purchase_refunded', 'purchase_chargeback')
      ))
    order by o.metadata->>'payment_id', o.event_timestamp desc
  ),
  -- Origem do webinário: venda front mais recente do mesmo buyer_email.
  webinar_origin as materialized (
    select distinct on (o.metadata->>'buyer_email')
      o.metadata->>'buyer_email' as buyer_email,
      public.campaign_product_slug(o.metadata->>'product_id') as slug
    from public.funnel_events o
    where p_product is not null
      and o.event_type = 'purchase'
      and o.metadata->>'buyer_email' = any(array(
        select b.buyer_email from base b
        where b.own_slug is null and b.event_type like 'purchase_webinario%'
      ))
    order by o.metadata->>'buyer_email', o.event_timestamp desc
  ),
  -- union all: o join com as origens só vale para as poucas linhas sem produto próprio (reembolsos e
  -- webinários); juntar as ~90 mil linhas inteiras gerava 3 sorts em disco (~8 s a mais por consulta).
  scoped as (
    select b.*, b.own_slug as product_slug from base b where b.own_slug is not null
    union all
    select b.*, coalesce(ro.slug, wo.slug) as product_slug
    from base b
    left join refund_origin ro on b.payment_id = ro.payment_id
    left join webinar_origin wo on b.event_type like 'purchase_webinario%' and b.buyer_email = wo.buyer_email
    where b.own_slug is null
  ),
  filtered as (
    select * from scoped
    where p_product is null or product_slug = p_product
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
  from filtered
  group by traffic_source_id, utm_source, utm_campaign, utm_medium
  order by total_revenue_cents desc;
$$;

grant execute on function public.rpc_campaign_roi(text, text, text, date, date, text, text) to anon, authenticated;

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
  p_traffic_source_id text default null,
  p_product text default null
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
  with w as materialized (
    select e.metadata as metadata, e.event_type, e.metadata->>'buyer_email' as buyer_email
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
      and (e.event_timestamp at time zone 'America/Sao_Paulo')::date between p_date_from and p_date_to
  ),
  -- Origem: venda front mais recente do mesmo buyer_email (só consultada quando há filtro de produto).
  webinar_origin as materialized (
    select distinct on (o.metadata->>'buyer_email')
      o.metadata->>'buyer_email' as buyer_email,
      public.campaign_product_slug(o.metadata->>'product_id') as slug
    from public.funnel_events o
    where p_product is not null
      and o.event_type = 'purchase'
      and o.metadata->>'buyer_email' = any(array(select w.buyer_email from w))
    order by o.metadata->>'buyer_email', o.event_timestamp desc
  )
  select
    coalesce(nullif(w.metadata->>'product_code', ''), 'desconhecido') as product_code,
    coalesce(nullif(w.metadata->>'product_name', ''), 'Produto sem nome') as product_name,
    count(*) filter (where w.event_type = 'purchase_webinario') as purchase_count,
    coalesce(sum((w.metadata->>'price_cents')::bigint) filter (where w.event_type = 'purchase_webinario'), 0) as gross_revenue_cents
  from w
  left join webinar_origin wo on wo.buyer_email = w.buyer_email
  where p_product is null or wo.slug = p_product
  group by 1, 2
  having count(*) filter (where w.event_type = 'purchase_webinario') > 0
  order by gross_revenue_cents desc, purchase_count desc, product_name asc;
$$;

grant execute on function public.rpc_webinar_products_for_campaign(text, text, text, text, text, text, date, date, text, text) to anon, authenticated;
