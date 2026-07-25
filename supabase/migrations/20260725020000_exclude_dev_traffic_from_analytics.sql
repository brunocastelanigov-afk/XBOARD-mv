-- Corrige "Respostas do Funil" (e todas as demais páginas que dependem de
-- funnel_events_flat_view: Performance, Auditoria, Resultados) mostrando taxas de
-- passagem impossíveis (ex.: etapa 4 com mais entradas que a etapa 3 no mesmo dia).
--
-- Causa raiz (achado via investigação, não relacionado às Stories 1.1-1.4): 2648 de ~3295
-- linhas de funnel_events para o funil desafio_treino_trinca (80%!) vêm de origens de
-- desenvolvimento local (http://localhost:*, http://127.0.0.1:*), acumuladas desde
-- 2026-07-16 por múltiplas sessões de dev/teste que apontavam o VITE_FUNNEL_WORKER_URL
-- local para o worker de PRODUÇÃO. funnel_events_flat_view (base de rpc_step_results,
-- rpc_performance, rpc_lead_audit*, rpc_lead_responses*, rpc_campaign_performance,
-- rpc_device_performance) nunca filtrou is_test nem origem de dev — ao contrário das RPCs
-- mais novas (rpc_campaign_roi etc.), que já excluem is_test desde a Story 1.1.
--
-- Fix: 1) tagear retroativamente as linhas de origem de dev como metadata.is_test=true
-- (correção de dados, não deleção — reversível); 2) fazer funnel_events_flat_view excluir
-- is_test=true, alinhando-a com o padrão já usado no restante do projeto.

update public.funnel_events
set metadata = metadata || jsonb_build_object('is_test', true, 'is_test_reason', 'local_dev_origin_backfill_2026_07_25')
where (metadata->>'is_test') is distinct from 'true'
  and (
    metadata->>'origin' like 'http://localhost:%'
    or metadata->>'origin' like 'http://127.0.0.1:%'
    or metadata->>'page_url' like 'http://localhost:%'
    or metadata->>'page_url' like 'http://127.0.0.1:%'
  );

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
  event_timestamp::date as event_date,
  date_trunc('hour', event_timestamp) as event_hour,
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
