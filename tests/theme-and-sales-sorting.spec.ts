import { test, expect } from "@playwright/test"

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const TEAM_EMAIL = "time.melhorversao@gmail.com"

const mockCampaignRoiRows = [
  {
    traffic_source_id: "facebook",
    utm_source: "facebook",
    utm_campaign: "camp_medium_sales",
    utm_medium: "cpc",
    front_revenue_cents: 50000,
    upsell_revenue_cents: 0,
    upsell02_revenue_cents: 0,
    webinar_revenue_cents: 0,
    total_revenue_cents: 50000,
    reversed_revenue_cents: 0,
    front_orders: 5,
    upsell_orders: 0,
    upsell02_orders: 0,
    webinar_orders: 0,
    unmatched_revenue_cents: 0,
  },
  {
    traffic_source_id: "facebook",
    utm_source: "facebook",
    utm_campaign: "camp_highest_sales",
    utm_medium: "cpc",
    front_revenue_cents: 100000,
    upsell_revenue_cents: 0,
    upsell02_revenue_cents: 0,
    webinar_revenue_cents: 0,
    total_revenue_cents: 100000,
    reversed_revenue_cents: 0,
    front_orders: 10,
    upsell_orders: 0,
    upsell02_orders: 0,
    webinar_orders: 0,
    unmatched_revenue_cents: 0,
  },
  {
    traffic_source_id: "facebook",
    utm_source: "facebook",
    utm_campaign: "camp_lowest_sales",
    utm_medium: "cpc",
    front_revenue_cents: 10000,
    upsell_revenue_cents: 0,
    upsell02_revenue_cents: 0,
    webinar_revenue_cents: 0,
    total_revenue_cents: 10000,
    reversed_revenue_cents: 0,
    front_orders: 1,
    upsell_orders: 0,
    upsell02_orders: 0,
    webinar_orders: 0,
    unmatched_revenue_cents: 0,
  },
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

test.describe("Theme Elite & Sales Sorting Validation", () => {
  test("Tema Elite: chaveamento, classes no html e persistência via localStorage", async ({ page }) => {
    await mockAuthAndRpcs(page)
    await page.goto("/roi-campanhas")

    // 1. Verifica botão de tema inicial
    const themeBtn = page.getByRole("button", { name: /Mudar para tema Elite|Tema Padrão/i })
    await expect(themeBtn).toBeVisible()
    await expect(page.locator("html")).not.toHaveClass(/theme-elite/)

    // 2. Clica para ativar o Tema Elite
    await themeBtn.click()
    await expect(page.locator("html")).toHaveClass(/theme-elite/)
    await expect(page.getByText("Tema Elite")).toBeVisible()

    const savedTheme = await page.evaluate(() => localStorage.getItem("mv-dashboard-theme"))
    expect(savedTheme).toBe("elite")

    // 3. Recarrega a página para validar persistência e tira print do Tema Elite
    await page.reload()
    await expect(page.locator("html")).toHaveClass(/theme-elite/)
    await expect(page.getByText("Tema Elite")).toBeVisible()
    await page.screenshot({ path: "docs/screenshots/campaign-roi-theme-elite.png", fullPage: true })

    // 4. Clica para voltar ao Tema Padrão e tira print
    const eliteBtn = page.getByRole("button", { name: /Mudar para tema Padrão|Tema Elite/i })
    await eliteBtn.click()
    await expect(page.locator("html")).not.toHaveClass(/theme-elite/)
    await expect(page.getByText("Tema Padrão")).toBeVisible()
    await page.screenshot({ path: "docs/screenshots/campaign-roi-theme-default.png", fullPage: true })

    const revertedTheme = await page.evaluate(() => localStorage.getItem("mv-dashboard-theme"))
    expect(revertedTheme).toBe("default")
  })

  test("Ordenação de Campanhas: Decrescente por padrão e Crescente após clique", async ({ page }) => {
    await mockAuthAndRpcs(page)
    await page.goto("/roi-campanhas")

    // Aguarda carregar as campanhas
    await expect(page.getByText("camp_highest_sales")).toBeVisible()
    await expect(page.getByText("camp_medium_sales")).toBeVisible()
    await expect(page.getByText("camp_lowest_sales")).toBeVisible()

    // Verifica botão de ordenação padrão (Decrescente: Maior ↓)
    const sortBtn = page.getByRole("button", { name: /Vendas Front: Maior ↓/i })
    await expect(sortBtn).toBeVisible()

    // Valida ordem das linhas da tabela no modo decrescente (10 -> 5 -> 1)
    const rowsDesc = await page.locator("table tbody tr").allInnerTexts()
    expect(rowsDesc.length).toBe(3)
    expect(rowsDesc[0]).toContain("camp_highest_sales")
    expect(rowsDesc[1]).toContain("camp_medium_sales")
    expect(rowsDesc[2]).toContain("camp_lowest_sales")
    await page.screenshot({ path: "docs/screenshots/campaign-roi-sort-desc.png", fullPage: true })

    // Clica para alternar para Crescente
    await sortBtn.click()
    await expect(page.getByRole("button", { name: /Vendas Front: Menor ↑/i })).toBeVisible()

    // Valida ordem invertida no modo crescente (1 -> 5 -> 10)
    const rowsAsc = await page.locator("table tbody tr").allInnerTexts()
    expect(rowsAsc.length).toBe(3)
    expect(rowsAsc[0]).toContain("camp_lowest_sales")
    expect(rowsAsc[1]).toContain("camp_medium_sales")
    expect(rowsAsc[2]).toContain("camp_highest_sales")
    await page.screenshot({ path: "docs/screenshots/campaign-roi-sort-asc.png", fullPage: true })

    // Clica novamente para voltar a Decrescente
    await page.getByRole("button", { name: /Vendas Front: Menor ↑/i }).click()
    await expect(page.getByRole("button", { name: /Vendas Front: Maior ↓/i })).toBeVisible()

    const rowsDescAgain = await page.locator("table tbody tr").allInnerTexts()
    expect(rowsDescAgain[0]).toContain("camp_highest_sales")
    expect(rowsDescAgain[2]).toContain("camp_lowest_sales")
  })
})
