-- Bug fix (não relacionado à Story 1.4): funnel_step_results_scoped agrupava por event_date,
-- e o frontend (uniqueSteps() em dashboard/src/pages/respostas.tsx e resultados.tsx) reduzia
-- pra UMA linha por step_number escolhendo, PARA CADA STEP INDEPENDENTEMENTE, o dia com mais
-- "entries". Como o volume de tráfego varia muito dia a dia, dias diferentes acabavam sendo
-- escolhidos para steps diferentes, produzindo passage_rate incomparável entre eles
-- (reproduzido e confirmado: step 1 = 100%, step 2 = 66%, step 4 = 89% no mesmo range de datas
-- — porque cada step "ganhava" seu próprio melhor dia isoladamente).
--
-- Fix: agregar por todo o período selecionado (sem particionar por event_date), que é o que a
-- UI sempre pretendeu mostrar. Mantém a coluna event_date na saída (contrato do
-- funnel_step_results_view não muda) com um valor representativo (p_date_to), já que nenhum
-- consumidor atual lê esse campo.
create or replace function public.funnel_step_results_scoped(
  p_funnel_id text,
  p_country text,
  p_funnel_variant text,
  p_date_from date,
  p_date_to date
)
returns setof funnel_step_results_view
language sql
stable
set search_path to 'public'
set work_mem to '64MB'
as $function$
  with scoped as materialized (
    select * from public.funnel_events_scoped(p_funnel_id, p_country, p_funnel_variant, p_date_from, p_date_to)
  ),
  step_entries as (
    select
      funnel_id, country, funnel_variant, step_number,
      max(step_name) filter (where step_name is not null) as step_name,
      count(distinct lead_id) filter (where event_type = 'page_view') as entries,
      count(distinct lead_id) filter (where event_type = 'page_avance') as advances
    from scoped
    where step_number is not null
    group by funnel_id, country, funnel_variant, step_number
  ),
  first_steps as (
    select funnel_id, country, funnel_variant, min(step_number) as first_step_number
    from step_entries
    group by funnel_id, country, funnel_variant
  ),
  first_step_entries as (
    select se.funnel_id, se.country, se.funnel_variant, se.entries as first_step_entries
    from step_entries se
    join first_steps fs
      on fs.funnel_id = se.funnel_id and fs.country = se.country
     and fs.funnel_variant is not distinct from se.funnel_variant
     and fs.first_step_number = se.step_number
  ),
  answer_counts as (
    select funnel_id, country, funnel_variant, step_number, answer_label, answer_code, count(*) as choices
    from scoped
    where event_type = 'data_collected' and step_number is not null and answer_label is not null
    group by funnel_id, country, funnel_variant, step_number, answer_label, answer_code
  ),
  answer_totals as (
    select funnel_id, country, funnel_variant, step_number, sum(choices) as total_choices
    from answer_counts
    group by funnel_id, country, funnel_variant, step_number
  ),
  answer_distribution as (
    select
      ac.funnel_id, ac.country, ac.funnel_variant, ac.step_number,
      jsonb_agg(
        jsonb_build_object(
          'answer_label', ac.answer_label, 'answer_code', ac.answer_code, 'choices', ac.choices,
          'percentage', round((ac.choices::numeric / nullif(at.total_choices, 0)) * 100, 2)
        )
        order by ac.choices desc, ac.answer_label
      ) as answer_distribution
    from answer_counts ac
    join answer_totals at
      on at.funnel_id = ac.funnel_id and at.country = ac.country
     and at.funnel_variant is not distinct from ac.funnel_variant and at.step_number = ac.step_number
    group by ac.funnel_id, ac.country, ac.funnel_variant, ac.step_number
  ),
  click_distribution as (
    select
      funnel_id, country, funnel_variant, step_number,
      jsonb_agg(
        jsonb_build_object('button_id', button_id, 'button_label', button_label, 'clicks', clicks)
        order by clicks desc, button_label
      ) as click_distribution
    from (
      select
        funnel_id, country, funnel_variant, step_number,
        coalesce(button_id, 'unknown') as button_id,
        coalesce(button_label, 'clicked') as button_label,
        count(*) as clicks
      from scoped
      where event_type = 'button_click' and step_number is not null
      group by funnel_id, country, funnel_variant, step_number, coalesce(button_id, 'unknown'), coalesce(button_label, 'clicked')
    ) clicks
    group by funnel_id, country, funnel_variant, step_number
  ),
  step_times as (
    select
      funnel_id, country, funnel_variant, step_number, lead_id,
      min(event_timestamp) filter (where event_type = 'page_view') as entered_at,
      min(event_timestamp) filter (where event_type = 'page_avance') as advanced_at
    from scoped
    where step_number is not null
    group by funnel_id, country, funnel_variant, step_number, lead_id
  ),
  avg_times as (
    select funnel_id, country, funnel_variant, step_number,
      avg(extract(epoch from advanced_at - entered_at)) filter (where entered_at is not null and advanced_at is not null) as average_time_seconds
    from step_times
    group by funnel_id, country, funnel_variant, step_number
  )
  select
    se.funnel_id, se.country, se.funnel_variant,
    p_date_to as event_date,
    se.step_number, se.step_name,
    se.entries, fse.first_step_entries,
    round(se.entries::numeric / nullif(fse.first_step_entries, 0), 4) as passage_rate,
    se.advances,
    round(se.advances::numeric / nullif(se.entries, 0), 4) as interaction_rate,
    at.average_time_seconds,
    coalesce(ad.answer_distribution, '[]'::jsonb) as answer_distribution,
    coalesce(cd.click_distribution, '[]'::jsonb) as click_distribution
  from step_entries se
  left join first_step_entries fse
    on fse.funnel_id = se.funnel_id and fse.country = se.country
   and fse.funnel_variant is not distinct from se.funnel_variant
  left join avg_times at
    on at.funnel_id = se.funnel_id and at.country = se.country
   and at.funnel_variant is not distinct from se.funnel_variant and at.step_number = se.step_number
  left join answer_distribution ad
    on ad.funnel_id = se.funnel_id and ad.country = se.country
   and ad.funnel_variant is not distinct from se.funnel_variant and ad.step_number = se.step_number
  left join click_distribution cd
    on cd.funnel_id = se.funnel_id and cd.country = se.country
   and cd.funnel_variant is not distinct from se.funnel_variant and cd.step_number = se.step_number
  order by se.step_number asc
$function$;

-- Limpeza de dados reais (não teste): 64 leads / 67 eventos que entraram diretamente em rotas
-- isoladas de preview (/bridge, /vsl, /slider, etc. — prováveis execuções de QA/Playwright
-- batendo no telemetry endpoint de produção) sem nunca ter step_number=1, distorcendo os
-- números de passagem do funil real. Removidos com autorização explícita do stakeholder.
-- Recomendação para não reincidir: rodar suítes de QA que navegam para rotas isoladas
-- (qa/tests/*) contra um VITE_FUNNEL_WORKER_URL local/mock, não contra o worker de produção.
with lead_min_step as (
  select lead_id, min(step_number) as min_step
  from public.funnel_events
  where step_number is not null
  group by lead_id
),
orphan_leads as (
  select lead_id from lead_min_step where min_step != 1
)
delete from public.funnel_events where lead_id in (select lead_id from orphan_leads);
