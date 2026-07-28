-- Pré-requisito pro fix de rpc_dashboard_filter_options() (próxima migração): descoberto ao
-- auditar o schema real que dashboard_filter_options_mv NÃO tem traffic_source_id — nem a
-- view que a alimenta (funnel_events_flat_view) expõe essa coluna. Sem ela, o RPC não
-- consegue nem devolver o campo nem aplicar o filtro de isolamento por role (tiktok_only etc).
--
-- 1) Estende funnel_events_flat_view: CREATE OR REPLACE VIEW só quebra se remover/reordenar
--    colunas existentes — apêndice no fim é sempre seguro. Confirmado via pg_proc que 6
--    funções dependem desta view (funnel_events_scoped, rpc_lead_detail,
--    _recompute_funnel_performance_rollups_for_dates, _apply_funnel_performance_delta,
--    rpc_lead_responses_fast, rpc_lead_audit_fast) — nenhuma faz SELECT *, todas continuam
--    funcionando com uma coluna nova no fim.
create or replace view public.funnel_events_flat_view as
 select event_id,
    funnel_id,
    country,
    funnel_variant,
    event_type,
    step_name,
    step_number,
    lead_id,
    event_timestamp,
    ingested_at,
    (event_timestamp at time zone 'America/Sao_Paulo'::text)::date as event_date,
    (date_trunc('hour'::text, (event_timestamp at time zone 'America/Sao_Paulo'::text)) at time zone 'America/Sao_Paulo'::text) as event_hour,
    coalesce(metadata ->> 'lead_name'::text, metadata ->> 'name'::text, metadata ->> 'full_name'::text) as lead_name,
    coalesce(metadata ->> 'lead_email'::text, metadata ->> 'email'::text) as lead_email,
    coalesce(metadata ->> 'lead_phone'::text, metadata ->> 'phone'::text, metadata ->> 'whatsapp'::text) as lead_phone,
    coalesce(metadata ->> 'utm_source'::text, metadata ->> 'source'::text, metadata #>> '{utmify,utm_source}'::text[]) as utm_source,
    coalesce(metadata ->> 'utm_medium'::text, metadata ->> 'medium'::text, metadata #>> '{utmify,utm_medium}'::text[]) as utm_medium,
    coalesce(metadata ->> 'utm_campaign'::text, metadata ->> 'campaign'::text, metadata #>> '{utmify,utm_campaign}'::text[]) as utm_campaign,
    coalesce(metadata ->> 'utm_content'::text, metadata ->> 'content'::text, metadata #>> '{utmify,utm_content}'::text[]) as utm_content,
    coalesce(metadata ->> 'utm_term'::text, metadata ->> 'term'::text, metadata #>> '{utmify,utm_term}'::text[]) as utm_term,
    coalesce(metadata ->> 'utm_id'::text, metadata ->> 'campaign_id'::text, metadata #>> '{utmify,utm_id}'::text[]) as utm_id,
    coalesce(metadata ->> 'fbclid'::text, metadata #>> '{utmify,fbclid}'::text[]) as fbclid,
    coalesce(metadata ->> 'gclid'::text, metadata #>> '{utmify,gclid}'::text[]) as gclid,
    coalesce(metadata ->> 'ttclid'::text, metadata #>> '{utmify,ttclid}'::text[]) as ttclid,
    coalesce(metadata ->> 'xcod'::text, metadata #>> '{utmify,xcod}'::text[]) as xcod,
    coalesce(metadata ->> 'sck'::text, metadata #>> '{utmify,sck}'::text[]) as sck,
    coalesce(metadata ->> 'src'::text, metadata #>> '{utmify,src}'::text[]) as src,
    metadata ->> 'session_id'::text as session_id,
    coalesce(metadata ->> 'answer_value'::text, metadata ->> 'answer'::text, metadata ->> 'option_label'::text, metadata ->> 'selected_option'::text) as answer_value,
    coalesce(metadata ->> 'answer_label'::text, metadata ->> 'answer'::text, metadata ->> 'option_label'::text) as answer_label,
    coalesce(metadata ->> 'answer_code'::text, metadata ->> 'option_code'::text, metadata ->> 'option_id'::text) as answer_code,
    coalesce(metadata ->> 'button_id'::text, metadata ->> 'cta_id'::text, metadata ->> 'element_id'::text) as button_id,
    coalesce(metadata ->> 'button_label'::text, metadata ->> 'cta_label'::text, metadata ->> 'element_label'::text) as button_label,
    coalesce(metadata ->> 'device_type'::text, metadata #>> '{device,category}'::text[]) as device_type,
    coalesce(metadata ->> 'user_agent'::text, metadata #>> '{device,user_agent}'::text[]) as user_agent,
    metadata ->> 'origin'::text as origin,
    metadata,
    -- Coluna nova: mesma expressão que rpc_dashboard_filter_options já usa hoje direto em
    -- funnel_events (ver 20260727200000_fix_america_sao_paulo_date_bucketing.sql, linha 199-206).
    coalesce(traffic_source_id, public.classify_traffic_source(
      metadata ->> 'utm_source', metadata ->> 'fbclid', metadata ->> 'ttclid',
      metadata ->> 'gclid', metadata ->> 'src', metadata ->> 'sck'
    ), 'unknown') as traffic_source_id
   from funnel_events
  where (metadata ->> 'is_test'::text) is distinct from 'true'::text;

-- 2) Materialized view não suporta CREATE OR REPLACE — precisa dropar e recriar. DROP/CREATE
--    (ao contrário de REFRESH CONCURRENTLY) não precisa de CONCURRENTLY, roda numa transação
--    normal sem risco do problema visto no incidente de CPU.
drop materialized view if exists public.dashboard_filter_options_mv;

-- NOTA HISTÓRICA: a versão original desta migração recriava a MV com count(distinct lead_id)
-- sem filtro de event_type (mesma lógica que a MV já tinha antes, só acrescentando
-- traffic_source_id). Isso se mostrou incorreto por comparação direta contra a query ao vivo
-- de rpc_dashboard_filter_options() — ver 20260728210649_fix_leads_filter_in_filter_options_mv.sql,
-- aplicada logo em seguida, que corrige o cálculo de "leads". Mantendo esta migração como
-- foi de fato aplicada (histórico real no banco), a correção vem no próximo arquivo.
create materialized view public.dashboard_filter_options_mv as
  select
    funnel_id,
    country,
    funnel_variant,
    traffic_source_id,
    min(event_date) as min_event_date,
    max(event_date) as max_event_date,
    count(distinct lead_id)::integer as leads
  from funnel_events_flat_view
  group by funnel_id, country, funnel_variant, traffic_source_id
with data;

-- Índice único precisa cobrir todas as colunas do GROUP BY agora (senão duas linhas com
-- mesmo funnel/country/variant mas traffic_source_id diferente colidiriam) — é o que permite
-- o REFRESH CONCURRENTLY que o cron já roda a cada 5 min continuar funcionando sem mudança
-- nenhuma na função refresh_dashboard_filter_options_mv().
create unique index dashboard_filter_options_mv_uq
  on public.dashboard_filter_options_mv (funnel_id, country, coalesce(funnel_variant, ''::text), traffic_source_id);
