-- A/B Test — Upsell-02 nutrition bundle (traffic Supabase project).
-- Fase A/B/C/D sem atribuição de compra: schema, config pública, logging de views
-- e dashboard administrativo. Compra/refund/chargeback ficam bloqueados até a
-- captura real do payload Lastlink definir o identificador de oferta.

create extension if not exists pgcrypto;

create table if not exists public.ab_test_configs (
  id uuid primary key default gen_random_uuid(),
  test_key text not null unique,
  label text not null,
  is_active boolean not null default true,
  active_from timestamptz not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.ab_test_variants (
  id uuid primary key default gen_random_uuid(),
  test_key text not null references public.ab_test_configs(test_key) on delete cascade,
  variant_key text not null,
  label text not null,
  price_cents bigint not null check (price_cents > 0),
  checkout_url text not null,
  one_click_upsell_id text,
  split_percent integer not null check (split_percent between 0 and 100),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (test_key, variant_key)
);

create table if not exists public.ab_testing_logs (
  id uuid primary key default gen_random_uuid(),
  test_key text not null,
  event_type text not null check (event_type in ('view', 'purchase', 'refund', 'chargeback')),
  variant_key text not null,
  buyer_email text not null,
  amount_cents bigint,
  lastlink_event_id text,
  lastlink_product_id text,
  metadata jsonb not null default '{}'::jsonb,
  event_timestamp timestamptz not null default now(),
  ingested_at timestamptz not null default now()
);

create table if not exists public.ab_testing_rollups (
  test_key text not null,
  variant_key text not null,
  bucket_date date not null,
  views bigint not null default 0,
  purchases_count bigint not null default 0,
  purchases_gross_cents bigint not null default 0,
  refunds_count bigint not null default 0,
  refunds_cents bigint not null default 0,
  chargebacks_count bigint not null default 0,
  chargebacks_cents bigint not null default 0,
  net_revenue_cents bigint not null default 0,
  refreshed_at timestamptz not null default now(),
  primary key (test_key, variant_key, bucket_date)
);

create index if not exists ab_test_variants_test_key_sort_idx
  on public.ab_test_variants (test_key, sort_order);

create index if not exists ab_testing_logs_email_idx
  on public.ab_testing_logs (buyer_email);

create index if not exists ab_testing_logs_test_variant_idx
  on public.ab_testing_logs (test_key, variant_key, event_type, event_timestamp);

create index if not exists ab_testing_logs_lastlink_event_idx
  on public.ab_testing_logs (lastlink_event_id)
  where lastlink_event_id is not null;

alter table public.ab_test_configs enable row level security;
alter table public.ab_test_variants enable row level security;
alter table public.ab_testing_logs enable row level security;
alter table public.ab_testing_rollups enable row level security;

drop policy if exists "public_read_active_ab_test_configs" on public.ab_test_configs;
create policy "public_read_active_ab_test_configs"
  on public.ab_test_configs
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists "authenticated_manage_ab_test_configs" on public.ab_test_configs;

drop policy if exists "public_read_active_ab_test_variants" on public.ab_test_variants;
create policy "public_read_active_ab_test_variants"
  on public.ab_test_variants
  for select
  to anon, authenticated
  using (
    is_active
    and exists (
      select 1
      from public.ab_test_configs c
      where c.test_key = ab_test_variants.test_key
        and c.is_active
    )
  );

drop policy if exists "authenticated_manage_ab_test_variants" on public.ab_test_variants;
drop policy if exists "dashboard_admin_update_ab_test_variants" on public.ab_test_variants;
create policy "dashboard_admin_update_ab_test_variants"
  on public.ab_test_variants
  for update
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'dashboard_role', '') = 'dashboard_admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'dashboard_role', '') = 'dashboard_admin'
  );

drop policy if exists "public_insert_ab_test_views" on public.ab_testing_logs;
create policy "public_insert_ab_test_views"
  on public.ab_testing_logs
  for insert
  to anon, authenticated
  with check (
    event_type = 'view'
    and amount_cents is null
    and lastlink_event_id is null
    and lastlink_product_id is null
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

drop policy if exists "authenticated_read_ab_testing_logs" on public.ab_testing_logs;
create policy "authenticated_read_ab_testing_logs"
  on public.ab_testing_logs
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_manage_ab_testing_logs" on public.ab_testing_logs;

drop policy if exists "authenticated_read_ab_testing_rollups" on public.ab_testing_rollups;
create policy "authenticated_read_ab_testing_rollups"
  on public.ab_testing_rollups
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_manage_ab_testing_rollups" on public.ab_testing_rollups;

insert into public.ab_test_configs (test_key, label, is_active, active_from)
values (
  'upsell-02-nutrition',
  'Upsell-02 pacote nutricional',
  true,
  '2026-09-15 00:01:00 America/Sao_Paulo'::timestamptz
)
on conflict (test_key) do update
set label = excluded.label,
    active_from = excluded.active_from,
    updated_at = now();

insert into public.ab_test_variants (
  test_key,
  variant_key,
  label,
  price_cents,
  checkout_url,
  one_click_upsell_id,
  split_percent,
  sort_order
)
values
  ('upsell-02-nutrition', 'price_67', 'R$ 67', 6700, 'https://lastlink.com/p/C565C1DF3/checkout-payment/', 'llupsell-C199BC859-', 34, 1),
  ('upsell-02-nutrition', 'price_97', 'R$ 97', 9700, 'https://lastlink.com/p/CB8FF21CD/checkout-payment/', null, 33, 2),
  ('upsell-02-nutrition', 'price_147', 'R$ 147', 14700, 'https://lastlink.com/p/C02B3725C/checkout-payment/', null, 33, 3)
on conflict (test_key, variant_key) do update
set label = excluded.label,
    price_cents = excluded.price_cents,
    checkout_url = excluded.checkout_url,
    one_click_upsell_id = excluded.one_click_upsell_id,
    split_percent = excluded.split_percent,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

create or replace function public.rpc_ab_test_upsell2_config()
returns table (
  test_key text,
  label text,
  is_active boolean,
  active_from timestamptz,
  variant_key text,
  variant_label text,
  price_cents bigint,
  checkout_url text,
  one_click_upsell_id text,
  split_percent integer,
  sort_order integer
)
language sql
security invoker
stable
as $$
  select
    c.test_key,
    c.label,
    c.is_active,
    c.active_from,
    v.variant_key,
    v.label as variant_label,
    v.price_cents,
    v.checkout_url,
    v.one_click_upsell_id,
    v.split_percent,
    v.sort_order
  from public.ab_test_configs c
  join public.ab_test_variants v on v.test_key = c.test_key
  where c.test_key = 'upsell-02-nutrition'
    and c.is_active
    and v.is_active
  order by v.sort_order;
$$;

create or replace function public.rpc_ab_test_upsell2_summary(
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
  purchases_count bigint,
  purchases_gross_cents bigint,
  refunds_count bigint,
  refunds_cents bigint,
  chargebacks_count bigint,
  chargebacks_cents bigint,
  net_revenue_cents bigint,
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

grant execute on function public.rpc_ab_test_upsell2_config() to anon, authenticated;
grant execute on function public.rpc_ab_test_upsell2_summary(date, date) to authenticated;
