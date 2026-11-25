-- A/B do funil one-click (/oc-*) do Treino Trinca (traffic Supabase project).
-- Compara o fluxo padrao (checkout em nova aba) com o upsell/downsell one-click da
-- Lastlink, SO para compradores com `token` (cartao) -- quem chega sem token nao tem
-- one-click, fica no padrao e nao entra nas taxas (so no contador `sem_token`).
--
--   * oc_funnel_config  : percentual do braco one-click + kill switch (0% = tudo padrao).
--   * oc_funnel_events  : visualizacoes/cliques por etapa e braco (insert anonimo).
--   * rpc_oc_funnel_config  : leitura anonima da config (frontend do quiz).
--   * rpc_oc_funnel_summary : funil por braco e produto (dashboard).
-- Compras de upsell/downsell vem de funnel_events (cartao, >= R$ 10) e sao atribuidas ao
-- braco pelo ultimo clique do mesmo e-mail nos 30 min anteriores (webhook chega ~2 min depois).

create extension if not exists pgcrypto;

create table if not exists public.oc_funnel_config (
  test_key text primary key,
  label text not null,
  is_active boolean not null default true,
  one_click_percent integer not null default 0 check (one_click_percent between 0 and 100),
  active_from timestamptz not null default now(),
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.oc_funnel_events (
  id uuid primary key default gen_random_uuid(),
  test_key text not null default 'oc-one-click' references public.oc_funnel_config(test_key),
  arm text not null check (arm in ('padrao', 'one_click', 'sem_token')),
  step text not null check (
    step in ('obrigado_view', 'upsell_view', 'upsell_click', 'downsell_view', 'downsell_click', 'liberando_view')
  ),
  product text not null check (product in ('trinca', 'pink')),
  token_hash text check (token_hash is null or char_length(token_hash) between 8 and 64),
  buyer_email text check (buyer_email is null or char_length(buyer_email) <= 254),
  metadata jsonb not null default '{}'::jsonb,
  event_timestamp timestamptz not null default now(),
  ingested_at timestamptz not null default now(),
  -- sem_token so existe como contador de obrigado, sem chave de token.
  check (arm <> 'sem_token' or (step = 'obrigado_view' and token_hash is null)),
  check (arm = 'sem_token' or token_hash is not null)
);

-- Uma linha por compra (token) e etapa: recarregar a pagina nao duplica. NULLs (sem_token)
-- nao colidem entre si.
create unique index if not exists oc_funnel_events_token_step_uidx
  on public.oc_funnel_events (token_hash, step);

create index if not exists oc_funnel_events_arm_step_idx
  on public.oc_funnel_events (test_key, arm, step, event_timestamp);

create index if not exists oc_funnel_events_email_idx
  on public.oc_funnel_events (lower(buyer_email))
  where buyer_email is not null;

alter table public.oc_funnel_config enable row level security;
alter table public.oc_funnel_events enable row level security;

drop policy if exists "public_read_active_oc_funnel_config" on public.oc_funnel_config;
create policy "public_read_active_oc_funnel_config"
  on public.oc_funnel_config
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists "dashboard_admin_update_oc_funnel_config" on public.oc_funnel_config;
create policy "dashboard_admin_update_oc_funnel_config"
  on public.oc_funnel_config
  for update
  to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'dashboard_role', '') = 'dashboard_admin')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'dashboard_role', '') = 'dashboard_admin');

drop policy if exists "public_insert_oc_funnel_events" on public.oc_funnel_events;
create policy "public_insert_oc_funnel_events"
  on public.oc_funnel_events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.oc_funnel_config c
      where c.test_key = oc_funnel_events.test_key
        and c.is_active
        and oc_funnel_events.event_timestamp >= c.active_from
    )
  );

drop policy if exists "authenticated_read_oc_funnel_events" on public.oc_funnel_events;
create policy "authenticated_read_oc_funnel_events"
  on public.oc_funnel_events
  for select
  to authenticated
  using (true);

-- Comeca em 0%: todo mundo no padrao, so medindo o baseline.
insert into public.oc_funnel_config (test_key, label, is_active, one_click_percent, active_from)
values ('oc-one-click', 'Funil one-click (/oc-*)', true, 0, now())
on conflict (test_key) do nothing;

create or replace function public.rpc_oc_funnel_config()
returns table (is_active boolean, one_click_percent integer, active_from timestamptz)
language sql
security invoker
stable
as $$
  select c.is_active, c.one_click_percent, c.active_from
  from public.oc_funnel_config c
  where c.test_key = 'oc-one-click'
    and c.is_active;
$$;

create or replace function public.rpc_oc_funnel_summary(
  p_from date default null,
  p_to date default null
)
returns table (
  arm text,
  product text,
  obrigado_views bigint,
  upsell_views bigint,
  upsell_clicks bigint,
  downsell_views bigint,
  downsell_clicks bigint,
  liberando_views bigint,
  upsell_purchases bigint,
  upsell_revenue_cents bigint,
  downsell_purchases bigint,
  downsell_revenue_cents bigint
)
language sql
security invoker
stable
as $$
  with ev as (
    select e.*
    from public.oc_funnel_events e
    where e.test_key = 'oc-one-click'
      and (p_from is null or (e.event_timestamp at time zone 'America/Sao_Paulo')::date >= p_from)
      and (p_to is null or (e.event_timestamp at time zone 'America/Sao_Paulo')::date <= p_to)
  ),
  clicks as (
    select lower(buyer_email) as email, arm, product, step, event_timestamp as t
    from ev
    where step in ('upsell_click', 'downsell_click')
      and arm in ('padrao', 'one_click')
      and buyer_email is not null
  ),
  purch as (
    select
      lower(f.metadata->>'buyer_email') as email,
      f.event_timestamp as t,
      coalesce((f.metadata->>'price_cents')::bigint, 0) as cents,
      coalesce(f.metadata->>'payment_id', f.event_id::text) as pid
    from public.funnel_events f
    where f.event_type = 'purchase_upsell'
      and coalesce(f.metadata->>'is_test', 'false') <> 'true'
      and f.metadata->>'payment_method' = 'credit_card'
      -- exclui as ofertas de teste de R$ 5
      and coalesce((f.metadata->>'price_cents')::bigint, 0) >= 1000
      and f.event_timestamp >= coalesce((select min(t) from clicks), 'infinity'::timestamptz)
  ),
  attributed as (
    select distinct on (p.pid) p.pid, c.arm, c.product, c.step, p.cents
    from purch p
    join clicks c
      on c.email = p.email
     and p.t >= c.t
     and p.t <= c.t + interval '30 minutes'
    order by p.pid, c.t desc
  ),
  counts as (
    select
      arm,
      product,
      count(*) filter (where step = 'obrigado_view') as obrigado_views,
      count(*) filter (where step = 'upsell_view') as upsell_views,
      count(*) filter (where step = 'upsell_click') as upsell_clicks,
      count(*) filter (where step = 'downsell_view') as downsell_views,
      count(*) filter (where step = 'downsell_click') as downsell_clicks,
      count(*) filter (where step = 'liberando_view') as liberando_views
    from ev
    group by arm, product
  ),
  buys as (
    select
      arm,
      product,
      count(*) filter (where step = 'upsell_click') as upsell_purchases,
      coalesce(sum(cents) filter (where step = 'upsell_click'), 0) as upsell_revenue_cents,
      count(*) filter (where step = 'downsell_click') as downsell_purchases,
      coalesce(sum(cents) filter (where step = 'downsell_click'), 0) as downsell_revenue_cents
    from attributed
    group by arm, product
  )
  select
    c.arm,
    c.product,
    c.obrigado_views,
    c.upsell_views,
    c.upsell_clicks,
    c.downsell_views,
    c.downsell_clicks,
    c.liberando_views,
    coalesce(b.upsell_purchases, 0),
    coalesce(b.upsell_revenue_cents, 0),
    coalesce(b.downsell_purchases, 0),
    coalesce(b.downsell_revenue_cents, 0)
  from counts c
  left join buys b on b.arm = c.arm and b.product = c.product
  order by c.product, c.arm;
$$;

grant execute on function public.rpc_oc_funnel_config() to anon, authenticated;
grant execute on function public.rpc_oc_funnel_summary(date, date) to authenticated;
