-- Achado da conversa de arquitetura (ver docs/architecture/ingestion-queue-architecture.md,
-- seção 5, nota): dashboard_filter_options_mv já existe e é mantida fresca por
-- refresh_dashboard_filter_options_mv() via pg_cron a cada 5 min, mas
-- rpc_dashboard_filter_options() (a função que o dashboard efetivamente chama) ignora a MV
-- e recalcula funnel_events do zero a cada chamada — reprocessando JSON, reclassificando
-- origem, e fazendo count(distinct lead_id) toda vez.
--
-- ATENÇÃO — NÃO APLICAR ESTA MIGRAÇÃO ÀS CEGAS: o SELECT abaixo assume que
-- dashboard_filter_options_mv tem exatamente as colunas
-- (funnel_id, country, funnel_variant, traffic_source_id, min_event_date, max_event_date, leads)
-- — o mesmo shape retornado pela função atual (ver 20260727200000_fix_america_sao_paulo_date_bucketing.sql,
-- linhas 180-225). Isso não foi confirmado contra o schema ao vivo (Supabase indisponível
-- durante um upgrade de compute no momento em que esta migração foi escrita). Antes de aplicar:
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'dashboard_filter_options_mv'
--   order by ordinal_position;
-- Se os nomes/tipos não baterem, ajustar o SELECT abaixo antes de aplicar.
--
-- Também precisa preservar o isolamento de role por fonte de tráfego (effective_filter,
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
