-- Problema 04 (goal 2026-07-27): todo o dashboard bucketiza eventos por dia/hora usando
-- ::date / date_trunc('hour', ...) direto sobre event_timestamp (timestamptz). Como a sessão
-- do Postgres/Supabase roda em UTC, esses casts truncam no calendário UTC, não no calendário
-- de Brasília. Eventos entre 21:00-23:59:59 BRT (=00:00-02:59:59 UTC do dia seguinte) acabam
-- sendo contados no dia errado em todos os filtros de data da dashboard (24h, 7 dias, custom).
--
-- event_timestamp em si é um instante UTC correto (auditado em produção: ingest_lag entre
-- event_timestamp/ingested_at é de ~1s para eventos recentes) -- não há necessidade de corrigir
-- dados já gravados, só a forma como lemos/agrupamos por dia/hora.
--
-- funnel_events_flat_view é o único ponto de verdade para event_date/event_hour: performance,
-- campaign-performance, device-performance, step-results, lead-audit* e lead-responses dependem
-- dela (direta ou indiretamente via funnel_events_scoped). Corrigindo-a aqui, todas essas RPCs
-- ficam corretas sem precisar de migração própria. rpc_campaign_roi e rpc_dashboard_filter_options
-- consultam funnel_events diretamente (não passam pela view), por isso precisam do mesmo fix
-- em separado.

create or replace view public.funnel_events_flat_view as
select
  event_id,
  funnel_id,
  country,
  funnel_variant,
  event_type,
  step_name,
  step_number,
  lead_id,
  event_timestamp,
  ingested_at,
  (event_timestamp at time zone 'America/Sao_Paulo')::date as event_date,
  date_trunc('hour', event_timestamp at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' as event_hour,
  coalesce(metadata ->> 'lead_name', metadata ->> 'name', metadata ->> 'full_name') as lead_name,
  coalesce(metadata ->> 'lead_email', metadata ->> 'email') as lead_email,
  coalesce(metadata ->> 'lead_phone', metadata ->> 'phone', metadata ->> 'whatsapp') as lead_phone,
  coalesce(metadata ->> 'utm_source', metadata ->> 'source', metadata #>> '{utmify,utm_source}') as utm_source,
  coalesce(metadata ->> 'utm_medium', metadata ->> 'medium', metadata #>> '{utmify,utm_medium}') as utm_medium,
  coalesce(metadata ->> 'utm_campaign', metadata ->> 'campaign', metadata #>> '{utmify,utm_campaign}') as utm_campaign,
  coalesce(metadata ->> 'utm_content', metadata ->> 'content', metadata #>> '{utmify,utm_content}') as utm_content,
  coalesce(metadata ->> 'utm_term', metadata ->> 'term', metadata #>> '{utmify,utm_term}') as utm_term,
  coalesce(metadata ->> 'utm_id', metadata ->> 'campaign_id', metadata #>> '{utmify,utm_id}') as utm_id,
  coalesce(metadata ->> 'fbclid', metadata #>> '{utmify,fbclid}') as fbclid,
  coalesce(metadata ->> 'gclid', metadata #>> '{utmify,gclid}') as gclid,
  coalesce(metadata ->> 'ttclid', metadata #>> '{utmify,ttclid}') as ttclid,
  coalesce(metadata ->> 'xcod', metadata #>> '{utmify,xcod}') as xcod,
  coalesce(metadata ->> 'sck', metadata #>> '{utmify,sck}') as sck,
  coalesce(metadata ->> 'src', metadata #>> '{utmify,src}') as src,
  metadata ->> 'session_id' as session_id,
  coalesce(metadata ->> 'answer_value', metadata ->> 'answer', metadata ->> 'option_label', metadata ->> 'selected_option') as answer_value,
  coalesce(metadata ->> 'answer_label', metadata ->> 'answer', metadata ->> 'option_label') as answer_label,
  coalesce(metadata ->> 'answer_code', metadata ->> 'option_code', metadata ->> 'option_id') as answer_code,
  coalesce(metadata ->> 'button_id', metadata ->> 'cta_id', metadata ->> 'element_id') as button_id,
  coalesce(metadata ->> 'button_label', metadata ->> 'cta_label', metadata ->> 'element_label') as button_label,
  coalesce(metadata ->> 'device_type', metadata #>> '{device,category}') as device_type,
  coalesce(metadata ->> 'user_agent', metadata #>> '{device,user_agent}') as user_agent,
  metadata ->> 'origin' as origin,
  metadata
from public.funnel_events
where (metadata ->> 'is_test') is distinct from 'true';

create or replace function public.funnel_events_scoped(
  p_funnel_id text, p_country text, p_funnel_variant text,
  p_date_from date, p_date_to date
)
returns setof public.funnel_events_flat_view
language sql stable
set search_path to 'public'
as $function$
  select *
  from public.funnel_events_flat_view
  where (p_funnel_id is null or funnel_id = p_funnel_id)
    and (p_country is null or country = p_country)
    and (
      p_funnel_variant is null
      or (p_funnel_variant = '__null__' and funnel_variant is null)
      or (p_funnel_variant <> '__null__' and funnel_variant = p_funnel_variant)
    )
    and event_timestamp >= (p_date_from::timestamp at time zone 'America/Sao_Paulo')
    and event_timestamp < ((p_date_to + 1)::timestamp at time zone 'America/Sao_Paulo')
    and event_date >= p_date_from
    and event_date <= p_date_to
$function$;

create or replace function public.rpc_campaign_roi(
  p_funnel_id text, p_country text, p_funnel_variant text,
  p_date_from date, p_date_to date, p_traffic_source_id text default null::text
)
returns table(
  traffic_source_id text, utm_source text, utm_campaign text, utm_medium text,
  front_revenue_cents bigint, upsell_revenue_cents bigint, total_revenue_cents bigint,
  reversed_revenue_cents bigint, front_orders bigint, upsell_orders bigint,
  unmatched_revenue_cents bigint
)
language sql stable security definer
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

create or replace function public.rpc_dashboard_filter_options()
returns table(funnel_id text, country text, funnel_variant text, traffic_source_id text, min_event_date date, max_event_date date, leads bigint)
language sql stable security definer
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
    min((e.event_timestamp at time zone 'America/Sao_Paulo')::date) as min_event_date,
    max((e.event_timestamp at time zone 'America/Sao_Paulo')::date) as max_event_date,
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
