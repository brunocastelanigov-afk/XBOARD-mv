-- Resolve Upsell-02 A/B purchases by Lastlink Product.Name + Offer.Name.
-- The same Lastlink product is reused across different price offers, so
-- Product.Id alone is not enough for attribution.

alter table public.ab_test_variants
  add column if not exists product_name text,
  add column if not exists offer_name text;

alter table public.ab_testing_logs
  add column if not exists lastlink_product_name text,
  add column if not exists lastlink_offer_id text,
  add column if not exists lastlink_offer_name text;

create index if not exists ab_test_variants_product_offer_name_idx
  on public.ab_test_variants (
    test_key,
    lower(btrim(product_name)),
    lower(btrim(offer_name))
  )
  where product_name is not null
    and offer_name is not null;

update public.ab_test_variants
set product_name = 'Protocolo Alimentar | Desafio Treino Trinca',
    offer_name = '67,00',
    updated_at = now()
where test_key = 'upsell-02-nutrition'
  and variant_key = 'price_67';

update public.ab_test_variants
set product_name = 'Protocolo Alimentar | Desafio Treino Trinca',
    offer_name = '97,00',
    updated_at = now()
where test_key = 'upsell-02-nutrition'
  and variant_key = 'price_97';

update public.ab_test_variants
set product_name = 'Protocolo Alimentar | Desafio Treino Trinca',
    offer_name = '147,00',
    updated_at = now()
where test_key = 'upsell-02-nutrition'
  and variant_key = 'price_147';
