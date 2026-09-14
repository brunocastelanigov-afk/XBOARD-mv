-- Adds CTA click tracking to the Upsell-02 A/B test.

alter table public.ab_testing_logs
  drop constraint if exists ab_testing_logs_event_type_check;

alter table public.ab_testing_logs
  add constraint ab_testing_logs_event_type_check
  check (event_type in ('view', 'click', 'purchase', 'refund', 'chargeback'));

drop policy if exists "public_insert_ab_test_views" on public.ab_testing_logs;
drop policy if exists "public_insert_ab_test_interactions" on public.ab_testing_logs;
create policy "public_insert_ab_test_interactions"
  on public.ab_testing_logs
  for insert
  to anon, authenticated
  with check (
    event_type in ('view', 'click')
    and amount_cents is null
    and lastlink_event_id is null
    and lastlink_product_id is null
    and lastlink_product_name is null
    and lastlink_offer_id is null
    and lastlink_offer_name is null
    and exists (
      select 1
      from public.ab_test_configs c
      join public.ab_test_variants v
        on v.test_key = c.test_key
       and v.variant_key = ab_testing_logs.variant_key
      where c.test_key = ab_testing_logs.test_key
        and c.is_active
        and v.is_active
        and ab_testing_logs.event_timestamp >= c.active_from
    )
  );

drop function if exists public.rpc_ab_test_upsell2_summary(date, date);

create function public.rpc_ab_test_upsell2_summary(
  p_date_from date default null,
  p_date_to date default null
)
returns table (
  test_key text,
  variant_key text,
  variant_label text,
  price_cents bigint,
  split_percent integer,
  views bigint,
  clicks bigint,
  purchases_count bigint,
  purchases_gross_cents bigint,
  refunds_count bigint,
  refunds_cents bigint,
  chargebacks_count bigint,
  chargebacks_cents bigint,
  net_revenue_cents bigint,
  click_rate numeric,
  conversion_rate numeric
)
language sql
security invoker
stable
as $$
  with scoped_logs as (
    select *
    from public.ab_testing_logs l
    where l.test_key = 'upsell-02-nutrition'
      and (p_date_from is null or (l.event_timestamp at time zone 'America/Sao_Paulo')::date >= p_date_from)
      and (p_date_to is null or (l.event_timestamp at time zone 'America/Sao_Paulo')::date <= p_date_to)
  )
  select
    v.test_key,
    v.variant_key,
    v.label as variant_label,
    v.price_cents,
    v.split_percent,
    count(l.id) filter (where l.event_type = 'view') as views,
    count(l.id) filter (where l.event_type = 'click') as clicks,
    count(l.id) filter (where l.event_type = 'purchase') as purchases_count,
    coalesce(sum(l.amount_cents) filter (where l.event_type = 'purchase'), 0) as purchases_gross_cents,
    count(l.id) filter (where l.event_type = 'refund') as refunds_count,
    coalesce(sum(l.amount_cents) filter (where l.event_type = 'refund'), 0) as refunds_cents,
    count(l.id) filter (where l.event_type = 'chargeback') as chargebacks_count,
    coalesce(sum(l.amount_cents) filter (where l.event_type = 'chargeback'), 0) as chargebacks_cents,
    coalesce(sum(l.amount_cents) filter (where l.event_type = 'purchase'), 0)
      - coalesce(sum(l.amount_cents) filter (where l.event_type in ('refund', 'chargeback')), 0) as net_revenue_cents,
    case
      when count(l.id) filter (where l.event_type = 'view') = 0 then 0
      else round(
        (count(l.id) filter (where l.event_type = 'click'))::numeric
        / (count(l.id) filter (where l.event_type = 'view'))::numeric
        * 100,
        2
      )
    end as click_rate,
    case
      when count(l.id) filter (where l.event_type = 'view') = 0 then 0
      else round(
        (count(l.id) filter (where l.event_type = 'purchase'))::numeric
        / (count(l.id) filter (where l.event_type = 'view'))::numeric
        * 100,
        2
      )
    end as conversion_rate
  from public.ab_test_variants v
  left join scoped_logs l
    on l.test_key = v.test_key
   and l.variant_key = v.variant_key
  where v.test_key = 'upsell-02-nutrition'
    and v.is_active
  group by v.test_key, v.variant_key, v.label, v.price_cents, v.split_percent, v.sort_order
  order by v.sort_order;
$$;

grant execute on function public.rpc_ab_test_upsell2_summary(date, date) to authenticated;
