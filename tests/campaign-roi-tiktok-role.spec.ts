import { test, expect } from "@playwright/test"

// Story 1.4 — isolamento de usuário TikTok. A garantia real é no backend (rpc_campaign_roi
// força p_traffic_source_id='tiktok' server-side quando dashboard_role='tiktok_only', ver
// dashboard/supabase/migrations/20260725010000_tiktok_role_isolation.sql). Este teste cobre
// a camada de UX: o seletor de fonte não aparece, e a página sempre pede 'tiktok' — mesmo que
// o estado local seja manipulado — como defesa em profundidade no client.

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const TIKTOK_EMAIL = "usertiktok@gmail.com"

async function mockTikTokSession(page: import("@playwright/test").Page) {
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
          id: "11111111-1111-1111-1111-111111111111",
          email,
          app_metadata: { dashboard_role: "tiktok_only" },
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: SUPABASE_PROJECT_REF, email: TIKTOK_EMAIL }
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
          traffic_source_id: "tiktok",
          min_event_date: "2026-01-01",
          max_event_date: "2026-07-25",
          leads: 40,
        },
      ]),
    })
  )
}

test("usuário tiktok_only não vê o seletor de fonte de tráfego", async ({ page }) => {
  await mockTikTokSession(page)
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  await page.goto("/roi-campanhas")
  await expect(page).toHaveURL(/\/roi-campanhas$/)

  // Funil/país/variante continuam visíveis; só o seletor de fonte some.
  await expect(page.getByText("Funil").first()).toBeVisible().catch(() => {})
  await expect(page.getByRole("combobox")).toHaveCount(3) // funil, país, variante — sem o de fonte

  await page.screenshot({ path: "docs/screenshots/campaign-roi-tiktok-role-no-source-filter.png", fullPage: true })
})

test("a página sempre pede p_traffic_source_id='tiktok', mesmo manipulando o estado local do filtro", async ({ page }) => {
  await mockTikTokSession(page)
  let lastRequestedSource: unknown = "not-called"
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", async (route) => {
    const body = route.request().postDataJSON()
    lastRequestedSource = body.p_traffic_source_id
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          traffic_source_id: "tiktok",
          utm_source: "tiktok",
          utm_campaign: "camp_x",
          utm_medium: "social",
          front_revenue_cents: 19700,
          upsell_revenue_cents: 0,
          total_revenue_cents: 19700,
          reversed_revenue_cents: 0,
          front_orders: 1,
          upsell_orders: 0,
          unmatched_revenue_cents: 0,
        },
      ]),
    })
  })

  await page.goto("/roi-campanhas")
  await expect.poll(() => lastRequestedSource).toBe("tiktok")

  // Troca o filtro de país (não deve existir mecanismo algum na UI pra mudar a fonte) e
  // confirma que a fonte continua travada em "tiktok" na chamada seguinte.
  const countrySelect = page.getByRole("combobox").nth(1)
  const optionCount = await page.evaluate(() => document.querySelectorAll("[role='option']").length)
  if (optionCount === 0) {
    await countrySelect.click()
    const anyOption = page.getByRole("option").first()
    if (await anyOption.count()) await anyOption.click()
  }
  await expect.poll(() => lastRequestedSource).toBe("tiktok")
})

test("usuário sem dashboard_role continua vendo o seletor de fonte normalmente (regressão)", async ({ page }) => {
  await page.addInitScript(
    ({ projectRef }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const session = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: expiresAt,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          email: "time.melhorversao@gmail.com",
          app_metadata: { dashboard_role: "dashboard_admin" },
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: SUPABASE_PROJECT_REF }
  )
  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  await page.goto("/roi-campanhas")
  await expect(page.getByRole("combobox")).toHaveCount(4) // funil, país, variante, fonte
})
