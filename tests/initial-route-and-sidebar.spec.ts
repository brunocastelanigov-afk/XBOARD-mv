import { test, expect } from "@playwright/test"

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const TEAM_EMAIL = "time.melhorversao@gmail.com"

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
      body: JSON.stringify([]),
    })
  )

  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  )
}

test.describe("Initial Route and Sidebar Order", () => {
  test("acesso a rota raiz '/' redireciona automaticamente para '/roi-campanhas'", async ({ page }) => {
    await mockAuthAndRpcs(page)
    await page.goto("/")
    await expect(page).toHaveURL(/\/roi-campanhas$/)
    await expect(page.getByText("Receita Total").first()).toBeVisible()
  })

  test("o item 'ROI de Campanhas' e o primeiro item listado no menu do sidebar", async ({ page }) => {
    await mockAuthAndRpcs(page)
    await page.goto("/roi-campanhas")

    const sidebarButtons = page.locator("[data-sidebar='menu-button']")
    await expect(sidebarButtons.first()).toContainText("ROI de Campanhas")
    await expect(sidebarButtons.nth(1)).toContainText("Respostas")
  })
})
