import { test, expect } from "@playwright/test"

// Story 1.2 — Critério 3 do goal: verificar que o frontend recebe e renderiza
// corretamente os dados de rpc_campaign_roi, sem depender da função já estar
// aplicada em produção (ver dashboard/supabase/migrations/20260724120000_rpc_campaign_roi.sql).
// Autenticação e as duas RPCs consumidas pela página são mockadas via page.route,
// mantendo o teste determinístico e sem tocar dados reais.

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
// Precisa bater com VITE_DASHBOARD_TEAM_EMAIL (dashboard/.env) para passar em isAllowedTeamUser —
// só usado como string de comparação client-side no teste mockado, nenhuma credencial real trafega.
const TEAM_EMAIL = "time.melhorversao@gmail.com"

// Dados reais computados em 2026-07-25 pelo batch de auditoria dev-audit-2026-07-24
// (worker/test/manual/verify-campaign-audit.mjs, contra o Supabase real zcaypxqrteoedzbdmagm) —
// não é dado inventado; é exatamente o que rpc_campaign_roi calcularia para esse batch se
// não filtrasse metadata.is_test=true (usado aqui só para a captura visual, sem tocar produção).
const mockCampaignRoiRows = [
  { traffic_source_id: "facebook", utm_source: "facebook", utm_campaign: "camp_two_upsells", utm_medium: "cpc", front_revenue_cents: 19700, upsell_revenue_cents: 7400, total_revenue_cents: 27100, reversed_revenue_cents: 0, front_orders: 1, upsell_orders: 2, unmatched_revenue_cents: 0 },
  { traffic_source_id: "google", utm_source: "google", utm_campaign: "camp_front_upsell", utm_medium: "cpc", front_revenue_cents: 19700, upsell_revenue_cents: 4700, total_revenue_cents: 24400, reversed_revenue_cents: 0, front_orders: 1, upsell_orders: 1, unmatched_revenue_cents: 0 },
  { traffic_source_id: "facebook", utm_source: "facebook", utm_campaign: "camp_front_only", utm_medium: "cpc", front_revenue_cents: 19700, upsell_revenue_cents: 0, total_revenue_cents: 19700, reversed_revenue_cents: 0, front_orders: 1, upsell_orders: 0, unmatched_revenue_cents: 0 },
  { traffic_source_id: "tiktok", utm_source: "tiktok", utm_campaign: "camp_upsell_chargeback", utm_medium: "social", front_revenue_cents: 19700, upsell_revenue_cents: 0, total_revenue_cents: 19700, reversed_revenue_cents: 9700, front_orders: 1, upsell_orders: 1, unmatched_revenue_cents: 0 },
  { traffic_source_id: "facebook", utm_source: "facebook", utm_campaign: "camp_front_refund", utm_medium: "cpc", front_revenue_cents: 0, upsell_revenue_cents: 4700, total_revenue_cents: 4700, reversed_revenue_cents: 19700, front_orders: 1, upsell_orders: 1, unmatched_revenue_cents: 0 },
  { traffic_source_id: "google", utm_source: "google", utm_campaign: "camp_front_full_refund", utm_medium: "cpc", front_revenue_cents: 0, upsell_revenue_cents: 0, total_revenue_cents: 0, reversed_revenue_cents: 19700, front_orders: 1, upsell_orders: 0, unmatched_revenue_cents: 0 },
  { traffic_source_id: "unknown", utm_source: "Sem UTM", utm_campaign: "Sem campanha", utm_medium: null, front_revenue_cents: 0, upsell_revenue_cents: 0, total_revenue_cents: 0, reversed_revenue_cents: 0, front_orders: 0, upsell_orders: 0, unmatched_revenue_cents: 24400 },
]

async function mockAuthAndRpcs(page: import("@playwright/test").Page) {
  await page.addInitScript(
    ({ projectRef, email }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const session = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: expiresAt,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          email,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: SUPABASE_PROJECT_REF, email: TEAM_EMAIL }
  )

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          funnel_id: "desafio_treino_trinca",
          country: "BR",
          funnel_variant: "a",
          traffic_source_id: "facebook",
          min_event_date: "2026-01-01",
          max_event_date: "2026-07-24",
          leads: 100,
        },
        {
          funnel_id: "desafio_treino_trinca",
          country: "BR",
          funnel_variant: "a",
          traffic_source_id: "tiktok",
          min_event_date: "2026-01-01",
          max_event_date: "2026-07-24",
          leads: 50,
        },
      ]),
    })
  )

  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockCampaignRoiRows),
    })
  )
}

test("página de ROI de campanhas renderiza métricas e tabela a partir da RPC", async ({ page }) => {
  await mockAuthAndRpcs(page)
  await page.goto("/roi-campanhas")

  await expect(page).toHaveURL(/\/roi-campanhas$/)

  // Métricas agregadas (soma de total_revenue_cents de todas as linhas): R$ 956,00
  await expect(page.getByText("R$ 956,00").first()).toBeVisible()

  // Seções por fonte e linhas da tabela
  await expect(page.getByRole("heading", { name: "TikTok" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Facebook / Meta" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "facebook / camp_two_upsells" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "tiktok / camp_upsell_chargeback" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "R$ 197,00" }).first()).toBeVisible()

  await page.screenshot({ path: "docs/screenshots/campaign-roi-todas-fontes.png", fullPage: true })
})

test("filtro de fonte envia p_traffic_source_id e mostra apenas TikTok", async ({ page }) => {
  await mockAuthAndRpcs(page)
  let requestedTrafficSource: unknown = null
  await page.unroute("**/rest/v1/rpc/rpc_campaign_roi*")
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", async (route) => {
    const body = route.request().postDataJSON()
    requestedTrafficSource = body.p_traffic_source_id
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockCampaignRoiRows.filter((row) => row.traffic_source_id === "tiktok")),
    })
  })

  await page.goto("/roi-campanhas")
  await page.getByRole("combobox").nth(3).click()
  await page.getByRole("option", { name: "TikTok" }).click()

  await expect.poll(() => requestedTrafficSource).toBe("tiktok")
  await expect(page.getByRole("heading", { name: "TikTok" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "tiktok / camp_upsell_chargeback" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "facebook / camp_two_upsells" })).toHaveCount(0)

  await page.screenshot({ path: "docs/screenshots/campaign-roi-tiktok-only.png", fullPage: true })
})

test("estado vazio da tabela quando a RPC não retorna campanhas", async ({ page }) => {
  await mockAuthAndRpcs(page)
  await page.unroute("**/rest/v1/rpc/rpc_campaign_roi*")
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  await page.goto("/roi-campanhas")
  await expect(page.getByText("Nenhum dado encontrado.")).toBeVisible()
})
