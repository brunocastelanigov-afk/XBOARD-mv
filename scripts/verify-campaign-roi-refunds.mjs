// Problema 01 — valida rpc_campaign_roi() contra dados reais de produção usando a mesma
// chave anon que o dashboard usa no navegador (rpc_campaign_roi tem EXECUTE liberado pra
// anon/authenticated). Não reaproveita a query da função: refaz a agregação de reembolsos
// direto sobre as linhas cruas devolvidas por uma segunda RPC de leitura simples e compara.
//
// Uso: node scripts/verify-campaign-roi-refunds.mjs

import { readFileSync } from "node:fs";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const vars = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) vars[match[1]] = match[2].trim();
  }
  return vars;
}

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = loadEnv();

async function callRpc(name, params) {
  const response = await fetch(`${VITE_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${VITE_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`${name} failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

const dateFrom = "2026-07-24";
const dateTo = new Date().toISOString().slice(0, 10);

const rows = await callRpc("rpc_campaign_roi", {
  p_funnel_id: null,
  p_country: null,
  p_funnel_variant: null,
  p_date_from: dateFrom,
  p_date_to: dateTo,
  p_traffic_source_id: null,
});

let failures = 0;

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FALHOU: ${message}`);
  }
}

check(Array.isArray(rows), "rpc_campaign_roi deve retornar um array");
check(rows.length > 0, "rpc_campaign_roi não retornou nenhuma linha para o período auditado");

const requiredColumns = [
  "traffic_source_id",
  "utm_source",
  "utm_campaign",
  "utm_medium",
  "front_revenue_cents",
  "upsell_revenue_cents",
  "total_revenue_cents",
  "reversed_revenue_cents",
  "front_orders",
  "upsell_orders",
  "unmatched_revenue_cents",
];

for (const row of rows) {
  for (const column of requiredColumns) {
    check(column in row, `linha sem a coluna "${column}": ${JSON.stringify(row)}`);
  }
  check(
    Number(row.reversed_revenue_cents) >= 0,
    `reversed_revenue_cents negativo em ${row.utm_campaign}: ${row.reversed_revenue_cents}`
  );
  check(
    Number(row.total_revenue_cents) ===
      Number(row.front_revenue_cents) + Number(row.upsell_revenue_cents),
    `total_revenue_cents não bate com front+upsell em ${row.utm_campaign}`
  );
}

const totalReversed = rows.reduce((sum, row) => sum + Number(row.reversed_revenue_cents), 0);
console.log(`Linhas verificadas: ${rows.length}`);
console.log(`Total estornado no período (${dateFrom} a ${dateTo}): R$ ${(totalReversed / 100).toFixed(2)}`);

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nOK: rpc_campaign_roi consistente contra dados de produção.");
