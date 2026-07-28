-- Achado #2 de docs/architecture/ingestion-queue-architecture.md (repo
-- melhor-versao-desafio-treino-trinca-replica): findFrontPurchaseByEmail e
-- findPurchaseByPaymentId (worker/src/supabase-client.js) filtram por
-- metadata->>buyer_email e metadata->>payment_id sem índice — mesmo padrão de seq scan
-- que causou o incidente de CPU, só que na atribuição de upsell/reembolso a campanha.
-- Mesma ressalva da migração anterior: CONCURRENTLY, aplicar fora de transação, com
-- CPU disponível.

create index concurrently if not exists
  funnel_events_buyer_email_idx
  on public.funnel_events ((metadata ->> 'buyer_email'))
  where event_type = 'purchase';

create index concurrently if not exists
  funnel_events_payment_id_idx
  on public.funnel_events ((metadata ->> 'payment_id'))
  where event_type in ('purchase', 'purchase_upsell');
