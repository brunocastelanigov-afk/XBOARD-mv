-- Fase 1 da arquitetura de ingestão (docs/architecture/ingestion-queue-architecture.md,
-- no repo melhor-versao-desafio-treino-trinca-replica). Parte 1/2: coluna + backfill,
-- seguro dentro de uma transação normal (sem CONCURRENTLY).
--
-- O índice UNIQUE (que precisa de CREATE INDEX CONCURRENTLY, incompatível com transação)
-- é a Parte 2/2, em 20260728120500_add_source_event_id_unique_index.sql — aplicado
-- separadamente, fora de horário de pico / com CPU disponível (ver incidente de
-- 2026-07-28: a mesma operação já falhou uma vez por contenção de CPU).

alter table public.funnel_events
  add column if not exists source_event_id text;

-- Backfill: só cobre o histórico do webhook Lastlink (único produtor que já tinha um id
-- estável em metadata). Telemetria histórica (/api/events) nunca teve event_id — fica
-- null pra sempre, o que é esperado (não precisa de idempotência retroativa).
update public.funnel_events
set source_event_id = metadata->>'lastlink_event_id'
where source_event_id is null
  and metadata->>'lastlink_event_id' is not null;
