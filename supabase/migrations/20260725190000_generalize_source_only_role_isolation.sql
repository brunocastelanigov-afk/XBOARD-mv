-- Generaliza o isolamento por fonte de tráfego introduzido na Story 1.4 (que só reconhecia
-- dashboard_role='tiktok_only') para qualquer role no formato "<source>_only" (ex.:
-- "google_only" -> força traffic_source_id='google'). Motivado pelo pedido de um segundo
-- usuário isolado, desta vez para Google Ads — sem essa generalização, um usuário com um role
-- novo (não "tiktok_only") passaria pelo "else p_traffic_source_id" sem nenhuma restrição real,
-- reproduzindo o mesmo tipo de falha de isolamento já corrigido pela Story 1.4.
--
-- Comportamento para dashboard_role='tiktok_only' é idêntico ao anterior (regexp extrai
-- "tiktok" do mesmo jeito) — sem regressão. dashboard_role='dashboard_admin' não termina em
-- "_only", continua sem nenhuma restrição.
drop function if exists public.rpc_campaign_roi(text, text, text, date, date, text);

create or replace function public.rpc_campaign_roi(
  p_funnel_id text,
  p_country text,
  p_funnel_variant text,
  p_date_from date,
  p_date_to date,
  p_traffic_source_id text default null::text
)
returns table(
  traffic_source_id text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  front_revenue_cents bigint,
  upsell_revenue_cents bigint,
  total_revenue_cents bigint,
  reversed_revenue_cents bigint,
  front_orders bigint,
  upsell_orders bigint,
  unmatched_revenue_cents bigint
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with caller_role as (
    select coalesce((select auth.jwt() -> 'app_metadata' ->> 'dashboard_role'), '') as dashboard_role
  ),
  effective_filter as (
    select case
      when (select dashboard_role from caller_role) ~ '_only$'
        then regexp_replace((select dashboard_role from caller_role), '_only$', '')
      else p_traffic_source_id
    end as traffic_source_id
  ),
  scoped as (
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
    where e.event_type in ('purchase', 'purchase_upsell', 'purchase_refunded', 'purchase_chargeback')
      and (e.metadata->>'is_test') is distinct from 'true'
      and (p_funnel_id is null or e.funnel_id = p_funnel_id)
      and (p_country is null or e.country = p_country)
      and (
        p_funnel_variant is null
        or (p_funnel_variant = '__null__' and e.funnel_variant is null)
        or (p_funnel_variant <> '__null__' and e.funnel_variant = p_funnel_variant)
      )
      and (
        (select traffic_source_id from effective_filter) is null
        or coalesce(e.traffic_source_id, public.classify_traffic_source(
          e.metadata->>'utm_source',
          e.metadata->>'fbclid',
          e.metadata->>'ttclid',
          e.metadata->>'gclid',
          e.metadata->>'src',
          e.metadata->>'sck'
        ), 'unknown') = (select traffic_source_id from effective_filter)
      )
      and e.event_timestamp::date between p_date_from and p_date_to
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
      where event_type in ('purchase', 'purchase_upsell') and attribution_status is distinct from 'unmatched'
    ), 0)
    - coalesce(sum(price_cents) filter (
      where event_type in ('purchase_refunded', 'purchase_chargeback') and attribution_status is distinct from 'unmatched'
    ), 0) as total_revenue_cents,
    coalesce(sum(price_cents) filter (
      where event_type in ('purchase_refunded', 'purchase_chargeback') and attribution_status is distinct from 'unmatched'
    ), 0) as reversed_revenue_cents,
    count(*) filter (where event_type = 'purchase' and attribution_status is distinct from 'unmatched') as front_orders,
    count(*) filter (where event_type = 'purchase_upsell' and attribution_status is distinct from 'unmatched') as upsell_orders,
    coalesce(sum(price_cents) filter (where attribution_status = 'unmatched'), 0) as unmatched_revenue_cents
  from scoped
  group by traffic_source_id, utm_source, utm_campaign, utm_medium
  order by total_revenue_cents desc;
$function$;

alter function public.rpc_campaign_roi(text, text, text, date, date, text) set search_path = public;
grant execute on function public.rpc_campaign_roi(text, text, text, date, date, text) to anon, authenticated;

-- rpc_dashboard_filter_options: mesma generalização, pra não popular selects de funil/país/
-- variante com combinações fora da fonte a que o usuário está restrito.
drop function if exists public.rpc_dashboard_filter_options();

create or replace function public.rpc_dashboard_filter_options()
returns table (
  funnel_id text,
  country text,
  funnel_variant text,
  traffic_source_id text,
  min_event_date date,
  max_event_date date,
  leads bigint
)
language sql
security definer
stable
set search_path to 'public'
as $function$
  with caller_role as (
    select coalesce((select auth.jwt() -> 'app_metadata' ->> 'dashboard_role'), '') as dashboard_role
  ),
  effective_filter as (
    select case
      when (select dashboard_role from caller_role) ~ '_only$'
        then regexp_replace((select dashboard_role from caller_role), '_only$', '')
      else null
    end as traffic_source_id
  )
  select
    e.funnel_id,
    e.country,
    e.funnel_variant,
    coalesce(e.traffic_source_id, public.classify_traffic_source(
      e.metadata->>'utm_source',
      e.metadata->>'fbclid',
      e.metadata->>'ttclid',
      e.metadata->>'gclid',
      e.metadata->>'src',
      e.metadata->>'sck'
    ), 'unknown') as traffic_source_id,
    min(e.event_timestamp::date) as min_event_date,
    max(e.event_timestamp::date) as max_event_date,
    count(distinct e.lead_id) filter (where e.event_type in ('page_view', 'page_avance', 'button_click', 'data_collected', 'vturb_start', 'checkout_start')) as leads
  from public.funnel_events e
  where (e.metadata->>'is_test') is distinct from 'true'
    and (
      (select traffic_source_id from effective_filter) is null
      or coalesce(e.traffic_source_id, public.classify_traffic_source(
        e.metadata->>'utm_source',
        e.metadata->>'fbclid',
        e.metadata->>'ttclid',
        e.metadata->>'gclid',
        e.metadata->>'src',
        e.metadata->>'sck'
      ), 'unknown') = (select traffic_source_id from effective_filter)
    )
  group by 1, 2, 3, 4
  order by 1, 2, 3, 4;
$function$;

alter function public.rpc_dashboard_filter_options() set search_path = public;
grant execute on function public.rpc_dashboard_filter_options() to anon, authenticated;
