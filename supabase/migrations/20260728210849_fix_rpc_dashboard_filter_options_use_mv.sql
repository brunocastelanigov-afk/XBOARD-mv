-- Achado da conversa de arquitetura (ver docs/architecture/ingestion-queue-architecture.md,
-- seção 5, nota): dashboard_filter_options_mv já existe e é mantida fresca por
-- refresh_dashboard_filter_options_mv() via pg_cron a cada 5 min, mas
-- rpc_dashboard_filter_options() (a função que o dashboard efetivamente chama) ignora a MV
-- e recalcula funnel_events do zero a cada chamada — reprocessando JSON, reclassificando
-- origem, e fazendo count(distinct lead_id) toda vez.
--
-- DEPENDE de 20260728210555_add_traffic_source_id_to_filter_options_mv.sql e
-- 20260728210649_fix_leads_filter_in_filter_options_mv.sql (aplicadas antes desta) —
-- auditoria contra o schema ao vivo confirmou que dashboard_filter_options_mv originalmente
-- não tinha traffic_source_id, e que "leads" precisava do mesmo filtro de event_type que
-- este RPC já usa (ver a segunda migração pro porquê — sem isso, leads_filtered divergia
-- de mv.leads em 7 de 10 linhas na comparação ao vivo).
--
-- Precisa preservar o isolamento de role por fonte de tráfego (effective_filter,
-- dashboard_role terminado em "_only") que a versão atual já implementa — senão usuários
-- com role tiktok_only (etc.) passam a ver dados de outras fontes.

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
    mv.funnel_id,
    mv.country,
    mv.funnel_variant,
    mv.traffic_source_id,
    mv.min_event_date,
    mv.max_event_date,
    mv.leads
  from public.dashboard_filter_options_mv mv
  where (
    (select traffic_source_id from effective_filter) is null
    or mv.traffic_source_id = (select traffic_source_id from effective_filter)
  )
  order by 1, 2, 3, 4;
$function$;
