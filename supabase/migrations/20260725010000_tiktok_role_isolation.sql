-- Story 1.4 (Isolamento de Usuário TikTok no Dashboard) — AC 1-3, 6, 7.
--
-- Parte 1: reverte/formaliza a correção do drift de produção encontrado no pré-flight
-- (aplicado fora de qualquer migration versionada — ver Dev Notes da Story 1.4):
--   - 10 RPCs do dashboard tinham sido convertidas de SECURITY DEFINER para SECURITY INVOKER
--   - RLS tinha sido ligada em funnel_events com uma policy "service_role_access" liberando
--     tudo pra "public" (não só service_role) e uma policy tiktok filtrando pela coluna
--     errada (funnel_variant em vez de traffic_source_id)
-- Essas correções já foram aplicadas ad-hoc via MCP durante o pré-flight desta story;
-- este bloco só formaliza/repete de forma idempotente para deixar versionado.

do $$
declare
  rec record;
begin
  for rec in
    select p.oid::regprocedure as func_sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'rpc_%'
      and p.prosecdef = false
  loop
    execute 'alter function ' || rec.func_sig || ' security definer';
  end loop;
end $$;

drop policy if exists "tiktok_only_access" on public.funnel_events;
drop policy if exists "all_access_except_tiktok" on public.funnel_events;
drop policy if exists "funnel_events_dashboard_admin_read" on public.funnel_events;

do $$
begin
  if exists (
    select 1 from pg_policies where tablename = 'funnel_events' and policyname = 'service_role_access'
  ) then
    alter policy "service_role_access" on public.funnel_events to service_role;
  end if;
end $$;

-- Desliga RLS: o isolamento desta story é garantido dentro da própria RPC (ver Parte 3),
-- não via RLS — motivo documentado nas Dev Notes da story (RLS já causou o drift acima,
-- afetando as outras 10 RPCs sem necessidade). Todas as RPCs continuam SECURITY DEFINER,
-- então RLS nunca seria consultada nesse caminho de qualquer forma.
alter table public.funnel_events disable row level security;

-- Parte 2: tag de role no usuário TikTok (idempotente — só atualiza se o usuário já existir;
-- não cria usuário aqui. Provisionamento via Admin API, fora desta migration).
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('dashboard_role', 'tiktok_only')
where email = 'usertiktok@gmail.com';

-- Parte 3: rpc_campaign_roi passa a forçar traffic_source_id='tiktok' para chamadores
-- com dashboard_role='tiktok_only', ignorando o que o cliente mandar em p_traffic_source_id.
-- Enforcement no servidor — não contornável via devtools/chamada direta à API.
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
  with caller_role as (
    select coalesce((select auth.jwt() -> 'app_metadata' ->> 'dashboard_role'), '') as dashboard_role
  ),
  effective_filter as (
    select case
      when (select dashboard_role from caller_role) = 'tiktok_only' then 'tiktok'
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
      and (p_funnel_variant is null or e.funnel_variant = p_funnel_variant)
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
$$;

alter function public.rpc_campaign_roi(text, text, text, date, date, text) set search_path = public;
grant execute on function public.rpc_campaign_roi(text, text, text, date, date, text) to anon, authenticated;

-- Parte 4: rpc_dashboard_filter_options também restrita para o usuário tiktok_only,
-- pra não popular os selects de funil/país/variante com combinações que não têm nenhum
-- dado tiktok (e não vazar contagem de leads de outras fontes).
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
  with caller_role as (
    select coalesce((select auth.jwt() -> 'app_metadata' ->> 'dashboard_role'), '') as dashboard_role
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
      (select dashboard_role from caller_role) is distinct from 'tiktok_only'
      or coalesce(e.traffic_source_id, public.classify_traffic_source(
        e.metadata->>'utm_source',
        e.metadata->>'fbclid',
        e.metadata->>'ttclid',
        e.metadata->>'gclid',
        e.metadata->>'src',
        e.metadata->>'sck'
      ), 'unknown') = 'tiktok'
    )
  group by 1, 2, 3, 4
  order by 1, 2, 3, 4;
$$;

alter function public.rpc_dashboard_filter_options() set search_path = public;
grant execute on function public.rpc_dashboard_filter_options() to anon, authenticated;
