-- Fase 1, parte 2/2. NÃO aplicar via apply_migration/transação — CREATE INDEX CONCURRENTLY
-- não pode rodar dentro de uma transação. Aplicar via execute_sql direto, com o Postgres
-- saudável (o incidente de 2026-07-28 mostrou essa mesma operação morrer por contenção de
-- CPU numa tabela de só 110 mil linhas — confirmar headroom antes de rodar).
--
-- Índice é UNIQUE simples (sem WHERE source_event_id is not null): por semântica padrão do
-- Postgres, um índice UNIQUE não constrange valores NULL entre si (NULL nunca é igual a NULL),
-- então múltiplas linhas legadas com source_event_id null continuam permitidas sem predicado
-- parcial. A vantagem de ficar sem predicado: PostgREST infere o alvo do
-- "ON CONFLICT (source_event_id) DO NOTHING" a partir de on_conflict=source_event_id sem
-- precisar replicar nenhum WHERE — um índice parcial quebraria essa inferência.

-- 1) Rodar antes, manualmente, e tratar qualquer resultado > 1 antes de prosseguir:
--    select source_event_id, count(*) from public.funnel_events
--    where source_event_id is not null group by source_event_id having count(*) > 1;

-- 2) Só depois de confirmado limpo:
create unique index concurrently if not exists
  funnel_events_source_event_id_uidx
  on public.funnel_events (source_event_id);
