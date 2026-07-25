-- Story 1.3 (Fonte de Trafego TikTok no ROI de Campanhas).
-- Migration aditiva: adiciona uma coluna normalizada de fonte de trafego sem
-- remover a leitura atual por metadata->>'utm_*'.

alter table public.funnel_events
  add column if not exists traffic_source_id text;

create or replace function public.classify_traffic_source(
  p_utm_source text,
  p_fbclid text,
  p_ttclid text,
  p_gclid text,
  p_src text,
  p_sck text
)
returns text
language sql
immutable
as $$
  with normalized as (
    select
      lower(trim(coalesce(p_utm_source, ''))) as utm_source,
      lower(trim(coalesce(p_src, ''))) as src,
      lower(trim(coalesce(p_sck, ''))) as sck,
      nullif(trim(coalesce(p_fbclid, '')), '') as fbclid,
      nullif(trim(coalesce(p_ttclid, '')), '') as ttclid,
      nullif(trim(coalesce(p_gclid, '')), '') as gclid
  )
  select case
    when ttclid is not null then 'tiktok'
    when fbclid is not null then 'facebook'
    when gclid is not null then 'google'
    when utm_source in ('tiktok', 'tik_tok', 'tik-tok', 'tt') then 'tiktok'
    when utm_source in ('facebook', 'fb', 'meta', 'instagram', 'ig') then 'facebook'
    when utm_source in ('youtube', 'yt') then 'youtube'
    when utm_source in ('google', 'gads', 'googleads', 'google_ads') then 'google'
    when utm_source in ('organic', 'direct', 'none') then 'organic'
    when src like '%tiktok%' or sck like '%tiktok%' then 'tiktok'
    when src like '%facebook%' or src like '%fb%' or src like '%meta%' or src like '%instagram%'
      or sck like '%facebook%' or sck like '%fb%' or sck like '%meta%' or sck like '%instagram%' then 'facebook'
    when src like '%youtube%' or src like '%yt%' or sck like '%youtube%' or sck like '%yt%' then 'youtube'
    when src like '%google%' or sck like '%google%' then 'google'
    else 'unknown'
  end
  from normalized;
$$;

update public.funnel_events
set traffic_source_id = public.classify_traffic_source(
  metadata->>'utm_source',
  metadata->>'fbclid',
  metadata->>'ttclid',
  metadata->>'gclid',
  metadata->>'src',
  metadata->>'sck'
)
where traffic_source_id is null;

create index if not exists idx_funnel_events_traffic_source_id
  on public.funnel_events (traffic_source_id);

drop function if exists public.rpc_campaign_roi(text, text, text, date, date);
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
  total_revenue_cents bigint,
  reversed_revenue_cents bigint,
  front_orders bigint,
  upsell_orders bigint,
  unmatched_revenue_cents bigint
)
language sql
security definer
stable
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
    where e.event_type in ('purchase', 'purchase_upsell', 'purchase_refunded', 'purchase_chargeback')
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
$$;

grant execute on function public.classify_traffic_source(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.rpc_campaign_roi(text, text, text, date, date, text) to anon, authenticated;

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
as $$
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
  group by 1, 2, 3, 4
  order by 1, 2, 3, 4;
$$;

grant execute on function public.rpc_dashboard_filter_options() to anon, authenticated;
