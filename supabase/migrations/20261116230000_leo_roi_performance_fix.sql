-- Correção de performance do ROI de Campanhas após 20261116120000 (Leo / meta_leo).
-- REGISTRO do que foi aplicado em produção em 2026-11-16 (3 migrations, nesta ordem):
--   1) leo_scope_perf_hotfix_inline_case  (20261116222502)
--   2) leo_scope_wrapper_over_fast_core   (20261116)
--   3) campaign_roi_sargable_date_range   (20261116)
--
-- Problema: rpc_campaign_roi lia ~630 mil linhas de funnel_events a cada chamada (o filtro de data
-- por dia de São Paulo não é sargável) e passava de 30 s (statement_timeout de `authenticated`),
-- derrubando a tela "ROI de Campanhas".
--
-- Estado final:
--   * rpc_campaign_roi_core  = versão original de 20261001140000 (sem lógica do Leo), sem acesso
--                              direto para anon/authenticated, com o filtro de data sargável.
--   * rpc_campaign_roi       = camada fina (SECURITY DEFINER) sobre o core: aplica escopo por role
--                              (dashboard_allowed_sources) e relabel para 'meta_leo' no resultado já
--                              agrupado por campanha.
--   * rpc_webinar_products_for_campaign = CASE inline no lugar de dashboard_source_of() + filtro de
--                              data sargável.
--   * Filtro sargável equivalente ao dia em America/Sao_Paulo, usa funnel_events_type_idx
--     (event_type, event_timestamp): 24 h ~0,8 s (antes > 50 s); 30 dias ~2-3 s com cache quente.
--
-- ATENÇÃO: o passo 2 recupera a definição original de rpc_campaign_roi do histórico em
-- supabase_migrations.schema_migrations (versão 20261001133207). Este arquivo documenta o que rodou
-- em produção; em um banco novo, aplique 20261001140000 antes.

-- 1) Hotfix: troca dashboard_source_of() por CASE inline (rpc_campaign_roi e webinar).
do $do$
declare
  fn text;
  def text;
  rx text := '^\s*\$\s*(3|5)(\D|$)';
begin
  foreach fn in array array[
    'public.rpc_campaign_roi(text,text,text,date,date,text,text)',
    'public.rpc_webinar_products_for_campaign(text,text,text,text,text,text,date,date,text,text)'
  ] loop
    def := pg_get_functiondef(fn::regprocedure);

    def := regexp_replace(
      def,
      'select public\.dashboard_source_of\(\s*coalesce\(',
      'select case when (select leo from scope) and s0.v in (''facebook'', ''unknown'') and e.metadata->>''utm_campaign'' ~ ''@@RX@@'' then ''meta_leo'' else s0.v end as sid from (select coalesce(',
      'g'
    );
    def := regexp_replace(
      def,
      '\), ''unknown''\),\s*e\.metadata->>''utm_campaign'',\s*\(select leo from scope\)\s*\) as sid',
      '), ''unknown'') as v) s0',
      'g'
    );
    def := replace(def, '@@RX@@', rx);

    if position('dashboard_source_of' in def) > 0 or position('s0.v' in def) = 0 or position('as v) s0' in def) = 0 then
      raise exception 'hotfix: substituicao nao aplicada em %', fn;
    end if;

    execute def;
  end loop;
end
$do$;

-- 2) Core rápido (original) + camada fina com escopo/meta_leo.
do $do$
declare
  stmt text;
  startpos int;
  rest text;
  endpos int;
  def text;
begin
  select statements[1] into stmt from supabase_migrations.schema_migrations where version = '20261001133207';
  startpos := position('create or replace function public.rpc_campaign_roi(' in stmt);
  if stmt is null or startpos = 0 then raise exception 'definicao original nao encontrada'; end if;
  rest := substr(stmt, startpos);
  endpos := position('$$;' in rest) + 2;
  def := substr(rest, 1, endpos);
  def := replace(def, 'create or replace function public.rpc_campaign_roi(', 'create or replace function public.rpc_campaign_roi_core(');
  execute def;
end
$do$;

revoke all on function public.rpc_campaign_roi_core(text, text, text, date, date, text, text) from public, anon, authenticated;

create or replace function public.rpc_campaign_roi(
  p_funnel_id text,
  p_country text,
  p_funnel_variant text,
  p_date_from date,
  p_date_to date,
  p_traffic_source_id text default null,
  p_product text default null
)
returns table (
  traffic_source_id text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  front_revenue_cents bigint,
  upsell_revenue_cents bigint,
  upsell02_revenue_cents bigint,
  webinar_revenue_cents bigint,
  total_revenue_cents bigint,
  reversed_revenue_cents bigint,
  front_orders bigint,
  upsell_orders bigint,
  upsell02_orders bigint,
  webinar_orders bigint,
  unmatched_revenue_cents bigint
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with scope as (
    select
      public.dashboard_allowed_sources() as allowed,
      (
        'meta_leo' = any (coalesce(public.dashboard_allowed_sources(), '{}'::text[]))
        or p_traffic_source_id = 'meta_leo'
      ) as leo
  ),
  raw as (
    select * from public.rpc_campaign_roi_core(
      p_funnel_id, p_country, p_funnel_variant, p_date_from, p_date_to,
      case when p_traffic_source_id = 'meta_leo' then null else p_traffic_source_id end,
      p_product
    )
  ),
  mapped as (
    select
      case
        when (select leo from scope)
          and r.traffic_source_id in ('facebook', 'unknown')
          and public.leo_meta_campaign(r.utm_campaign)
        then 'meta_leo'
        else r.traffic_source_id
      end as sid,
      r.utm_source, r.utm_campaign, r.utm_medium,
      r.front_revenue_cents, r.upsell_revenue_cents, r.upsell02_revenue_cents, r.webinar_revenue_cents,
      r.total_revenue_cents, r.reversed_revenue_cents,
      r.front_orders, r.upsell_orders, r.upsell02_orders, r.webinar_orders,
      r.unmatched_revenue_cents
    from raw r
  )
  select
    m.sid as traffic_source_id,
    m.utm_source, m.utm_campaign, m.utm_medium,
    sum(m.front_revenue_cents)::bigint,
    sum(m.upsell_revenue_cents)::bigint,
    sum(m.upsell02_revenue_cents)::bigint,
    sum(m.webinar_revenue_cents)::bigint,
    sum(m.total_revenue_cents)::bigint,
    sum(m.reversed_revenue_cents)::bigint,
    sum(m.front_orders)::bigint,
    sum(m.upsell_orders)::bigint,
    sum(m.upsell02_orders)::bigint,
    sum(m.webinar_orders)::bigint,
    sum(m.unmatched_revenue_cents)::bigint
  from mapped m
  where (p_traffic_source_id is null or m.sid = p_traffic_source_id)
    and (
      (select allowed from scope) is null
      or m.sid = any (coalesce((select allowed from scope), array[]::text[]))
    )
  group by m.sid, m.utm_source, m.utm_campaign, m.utm_medium
  order by sum(m.total_revenue_cents) desc;
$$;

grant execute on function public.rpc_campaign_roi(text, text, text, date, date, text, text) to anon, authenticated;

-- 3) Filtro de data sargável (equivalente ao dia em America/Sao_Paulo) no core e no webinário.
do $do$
declare
  fn text;
  def text;
  old_line text := 'and (e.event_timestamp at time zone ''America/Sao_Paulo'')::date between p_date_from and p_date_to';
  new_line text := 'and (e.event_timestamp at time zone ''America/Sao_Paulo'')::date between p_date_from and p_date_to
      and e.event_timestamp >= (p_date_from::timestamp at time zone ''America/Sao_Paulo'')
      and e.event_timestamp < ((p_date_to + 1)::timestamp at time zone ''America/Sao_Paulo'')';
begin
  foreach fn in array array[
    'public.rpc_campaign_roi_core(text,text,text,date,date,text,text)',
    'public.rpc_webinar_products_for_campaign(text,text,text,text,text,text,date,date,text,text)'
  ] loop
    def := pg_get_functiondef(fn::regprocedure);
    if position(old_line in def) = 0 then raise exception 'linha de data nao encontrada em %', fn; end if;
    def := replace(def, old_line, new_line);
    execute def;
  end loop;
end
$do$;

revoke all on function public.rpc_campaign_roi_core(text, text, text, date, date, text, text) from public, anon, authenticated;
