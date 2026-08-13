import { test, expect } from "@playwright/test"

// Story 15.3 — login.tsx tenta autenticar no Supabase de Tráfego primeiro
// e, se falhar, tenta no Supabase do app (CRM), conforme decisão do
// usuário registrada no draft (AskUserQuestion, 2026-08-13).

const TRAFFIC_URL = "https://zcaypxqrteoedzbdmagm.supabase.co"
const CRM_URL = "https://lcylofpnwlwaicewhsfl.supabase.co"

function tokenSuccessBody(email: string, appMetadata: Record<string, unknown> = {}) {
  return {
    access_token: "test-access-token",
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "test-refresh-token",
    user: {
      id: "00000000-0000-0000-0000-000000000000",
      email,
      app_metadata: appMetadata,
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    },
  }
}

const invalidCredentialsBody = {
  error: "invalid_grant",
  error_description: "Invalid login credentials",
}

test.describe("Story 15.3 — login sequencial Tráfego → CRM", () => {
  test("credenciais válidas no Supabase de Tráfego autenticam sem tentar o CRM", async ({
    page,
  }) => {
    let crmCalled = false

    await page.route(`${TRAFFIC_URL}/auth/v1/token*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(tokenSuccessBody("time.melhorversao@gmail.com")),
      })
    )
    await page.route(`${CRM_URL}/auth/v1/token*`, (route) => {
      crmCalled = true
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(invalidCredentialsBody),
      })
    })
    await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    )
    await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    )

    await page.goto("/login")
    await page.getByLabel("Email").fill("time.melhorversao@gmail.com")
    await page.getByLabel("Senha").fill("correct-password")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/roi-campanhas$/)
    expect(crmCalled).toBe(false)
  })

  test("credenciais inválidas no Tráfego, válidas no CRM, autenticam via fallback", async ({
    page,
  }) => {
    await page.route(`${TRAFFIC_URL}/auth/v1/token*`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(invalidCredentialsBody),
      })
    )
    await page.route(`${CRM_URL}/auth/v1/token*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          tokenSuccessBody("crm-account@example.com", { dashboard_role: "crm" })
        ),
      })
    )
    await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    )

    await page.goto("/login")
    await page.getByLabel("Email").fill("crm-account@example.com")
    await page.getByLabel("Senha").fill("crm-password")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Email ou senha inválidos.")).not.toBeVisible()
    await expect(page).not.toHaveURL(/\/login$/)
  })

  test("credenciais inválidas nos dois Supabase mostram o erro existente", async ({ page }) => {
    await page.route(`${TRAFFIC_URL}/auth/v1/token*`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(invalidCredentialsBody),
      })
    )
    await page.route(`${CRM_URL}/auth/v1/token*`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(invalidCredentialsBody),
      })
    )

    await page.goto("/login")
    await page.getByLabel("Email").fill("nobody@example.com")
    await page.getByLabel("Senha").fill("wrong-password")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByText("Email ou senha inválidos.")).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })
})
