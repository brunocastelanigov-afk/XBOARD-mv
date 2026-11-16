import { test, expect, type Page } from "@playwright/test"

// Leo (role "leo_traffic"): vê Google + "Meta — Leo ($3/$5)" somente em /roi-campanhas.
// A garantia real é no servidor (dashboard_allowed_sources() nas RPCs, migration
// 20261116120000_leo_meta_campaigns_scope.sql); aqui cobrimos a camada de UX/defesa no client.

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const LEO_EMAIL = "lmflix68@gmail.com"

async function mockLeoSession(page: Page) {
  await page.addInitScript(
    ({ projectRef, email }) => {
      const session = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "22222222-2222-2222-2222-222222222222",
          email,
          app_metadata: { dashboard_role: "leo_traffic" },
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: SUPABASE_PROJECT_REF, email: LEO_EMAIL }
  )

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        ["google", "facebook"].map((traffic_source_id) => ({
          funnel_id: "desafio_treino_trinca",
          country: "BR",
          funnel_variant: "a",
          traffic_source_id,
          min_event_date: "2026-01-01",
          max_event_date: "2026-11-16",
          leads: 10,
        }))
      ),
    })
  )
}

const baseRow = {
  utm_medium: null,
  upsell_revenue_cents: 0,
  upsell02_revenue_cents: 0,
  webinar_revenue_cents: 0,
  reversed_revenue_cents: 0,
  upsell_orders: 0,
  upsell02_orders: 0,
  webinar_orders: 0,
  unmatched_revenue_cents: 0,
}

test("Leo vê seções Google e Meta — Leo, e o seletor só lista essas duas fontes", async ({ page }) => {
  await mockLeoSession(page)
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { ...baseRow, traffic_source_id: "google", utm_source: "google", utm_campaign: "24236105038", front_revenue_cents: 19700, total_revenue_cents: 19700, front_orders: 1 },
        { ...baseRow, traffic_source_id: "meta_leo", utm_source: "FB", utm_campaign: "$3 PINK | CBO | PINK-D-19", front_revenue_cents: 39400, total_revenue_cents: 39400, front_orders: 2 },
      ]),
    })
  )

  await page.goto("/roi-campanhas")
  await expect(page.getByRole("heading", { name: "Google" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Meta — Leo ($3/$5)" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Facebook / Meta" })).toHaveCount(0)

  // Seletor de fonte existe (3 filtros + fonte + produto) e lista só Todas, Google e Meta — Leo.
  await page.getByRole("combobox").filter({ hasText: /Todas fontes|Fonte/ }).click()
  await expect(page.getByRole("option")).toHaveText(["Todas fontes", "Google", "Meta — Leo ($3/$5)"])
  await page.screenshot({ path: "docs/screenshots/campaign-roi-leo-role.png", fullPage: true })
})

test("Leo só acessa /roi-campanhas: sidebar com 1 item e URLs de outras páginas redirecionam", async ({ page }) => {
  await mockLeoSession(page)
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  await page.goto("/roi-campanhas")
  await expect(page.getByRole("link", { name: "Respostas" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Performance Geral" })).toHaveCount(0)

  for (const path of ["/performance", "/respostas", "/auditoria", "/teste-ab"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/roi-campanhas$/)
  }
})

test("escolher 'Meta — Leo' envia p_traffic_source_id='meta_leo' na RPC", async ({ page }) => {
  await mockLeoSession(page)
  const requested: unknown[] = []
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", async (route) => {
    requested.push(route.request().postDataJSON().p_traffic_source_id)
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.goto("/roi-campanhas")
  await expect.poll(() => requested.length).toBeGreaterThan(0)
  expect(requested[0]).toBeNull()

  await page.getByRole("combobox").filter({ hasText: /Todas fontes|Fonte/ }).click()
  await page.getByRole("option", { name: "Meta — Leo ($3/$5)" }).click()
  await expect.poll(() => requested.at(-1)).toBe("meta_leo")
})
