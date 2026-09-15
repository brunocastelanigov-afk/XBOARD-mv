-- Move Upsell-02 A/B test start to 2026-09-14 23:30 America/Sao_Paulo.

update public.ab_test_configs
set active_from = '2026-09-14 23:30:00 America/Sao_Paulo'::timestamptz,
    updated_at = now()
where test_key = 'upsell-02-nutrition';
