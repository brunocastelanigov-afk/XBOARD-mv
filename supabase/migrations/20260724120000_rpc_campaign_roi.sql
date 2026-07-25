-- Story 1.1 (Atribuição de ROI por Campanha) — AC 10, 11.
-- Aplicar manualmente via Supabase Studio > SQL Editor no projeto zcaypxqrteoedzbdmagm
-- (nenhuma credencial disponível neste ambiente de dev tem acesso a DDL nesse projeto;
--  service-role key só cobre REST/PostgREST, não execução de SQL arbitrário).
--
-- Receita líquida (compras menos refunds/chargebacks) front/upsell/não-atribuída por campanha,
-- lida de metadata->>'utm_source'/'utm_campaign'/'utm_medium' em funnel_events.
-- Exclui por padrão metadata->>'is_test' = 'true' (AC 11).

create or replace function public.rpc_campaign_roi(
  p_funnel_id text,
  p_country text,
  p_funnel_variant text,
  p_date_from date,
  p_date_to date
)
returns table (
  utm_source text,
  utm_campaign text,
  utm_medium text,
  front_revenue_cents bigint,      -- líquido: compras front - refunds/chargebacks de front
  upsell_revenue_cents bigint,     -- líquido: compras upsell - refunds/chargebacks de upsell
  total_revenue_cents bigint,      -- front + upsell (líquido)
  reversed_revenue_cents bigint,   -- total estornado (refund + chargeback), para transparência
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
      and e.event_timestamp::date between p_date_from and p_date_to
  )
  select
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
  group by utm_source, utm_campaign, utm_medium
  order by total_revenue_cents desc;
$$;

-- Sem isso, o dashboard (chamando via anon/authenticated key) recebe "permission denied"
-- mesmo com a função criada — replicar o mesmo grant já usado pelas demais rpc_* do projeto.
grant execute on function public.rpc_campaign_roi(text, text, text, date, date) to anon, authenticated;
