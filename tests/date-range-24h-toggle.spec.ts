import { test, expect } from "@playwright/test"

// Problema 02 — Critério de aceite: o botão "24 horas" passa a ter estado ativo/inativo;
// quando ativo, os campos de calendário ficam inativos e mostram o gap de horário relativo
// (não a data literal, que confundia o usuário perto da meia-noite). A mudança acontece via
// DashboardFiltersProvider/FilterBar, compartilhado por todas as páginas que usam o botão.

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
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_performance*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_campaign_performance*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_device_performance*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_step_results*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
}

test("botão 24 horas alterna para estado ativo e desativa os campos de calendário", async ({ page }) => {
  await mockAuthAndRpcs(page)
  await page.goto("/roi-campanhas")

  const toggleButton = page.getByRole("button", { name: "24 horas" })
  const dateFromInput = page.getByLabel("Data inicial")
  const dateToInput = page.getByLabel("Data final")

  // Estado inicial: inativo, calendário mostra datas editáveis.
  await expect(toggleButton).toHaveAttribute("aria-pressed", "false")
  await expect(dateFromInput).toBeEnabled()
  await expect(dateFromInput).toHaveAttribute("type", "date")

  // Ativa "24 horas".
  await toggleButton.click()
  await expect(toggleButton).toHaveAttribute("aria-pressed", "true")
  await expect(dateFromInput).toBeDisabled()
  await expect(dateToInput).toBeDisabled()
  await expect(dateFromInput).toHaveValue("Últimas 24h")
  await expect(dateToInput).toHaveValue("Até agora")

  // Clicar em "7 dias" desativa o toggle e volta a mostrar datas editáveis.
  await page.getByRole("button", { name: "7 dias" }).click()
  await expect(toggleButton).toHaveAttribute("aria-pressed", "false")
  await expect(dateFromInput).toBeEnabled()
  await expect(dateFromInput).toHaveAttribute("type", "date")
})

test("clicar novamente em 24 horas desliga o toggle e reabilita o calendário", async ({ page }) => {
  await mockAuthAndRpcs(page)
  await page.goto("/roi-campanhas")

  const toggleButton = page.getByRole("button", { name: "24 horas" })
  await toggleButton.click()
  await expect(toggleButton).toHaveAttribute("aria-pressed", "true")

  await toggleButton.click()
  await expect(toggleButton).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByLabel("Data inicial")).toBeEnabled()
})

test("estado do toggle 24h é compartilhado entre páginas (mesmo DashboardFiltersProvider)", async ({ page }) => {
  await mockAuthAndRpcs(page)
  await page.goto("/roi-campanhas")

  await page.getByRole("button", { name: "24 horas" }).click()
  await expect(page.getByRole("button", { name: "24 horas" })).toHaveAttribute("aria-pressed", "true")

  await page.getByRole("link", { name: /performance/i }).click()
  await expect(page).toHaveURL(/\/performance$/)

  await expect(page.getByRole("button", { name: "24 horas" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByLabel("Data inicial")).toBeDisabled()
  await expect(page.getByLabel("Data inicial")).toHaveValue("Últimas 24h")
})
