import { test, expect } from "@playwright/test"

// Cobre a otimização de leitura de /respostas e /auditoria (2026-07-28) --
// ver docs/sessions/2026-07/2026-07-28-handoff-completo.md. Essas duas
// páginas travavam com os filtros padrão do app (nenhum funil selecionado,
// últimos 7 dias) porque rpc_lead_responses/rpc_lead_audit recalculavam tudo
// do zero sem filtro de funil pra restringir o escopo. As RPCs *_fast agora
// usadas aqui leem de rollups por lead em vez da tabela bruta.

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const TEAM_EMAIL = "time.melhorversao@gmail.com"

async function mockAuth(page: import("@playwright/test").Page) {
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
}

test("/respostas: carrega com filtros padrao (sem funil selecionado) usando rpc_lead_responses_fast", async ({ page }) => {
  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  let responsesCalls = 0
  let countCalls = 0
  await page.route("**/rest/v1/rpc/rpc_lead_responses_fast*", (route) => {
    responsesCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**/rest/v1/rpc/rpc_lead_responses_count_fast*", (route) => {
    countCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "0" })
  })
  await page.route("**/rest/v1/rpc/rpc_step_results_fast*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  await page.goto("/respostas")

  await expect.poll(() => responsesCalls).toBeGreaterThan(0)
  await expect.poll(() => countCalls).toBeGreaterThan(0)
  await expect(page.getByText("Não foi possível carregar respostas.")).toHaveCount(0)
})

test("/respostas: botao de reload dispara refetch via rpc_lead_responses_fast", async ({ page }) => {
  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  let responsesCalls = 0
  await page.route("**/rest/v1/rpc/rpc_lead_responses_fast*", (route) => {
    responsesCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**/rest/v1/rpc/rpc_lead_responses_count_fast*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "0" })
  )
  await page.route("**/rest/v1/rpc/rpc_step_results_fast*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/refresh_funnel_performance_rollups*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "null" })
  )

  await page.goto("/respostas")
  await expect.poll(() => responsesCalls).toBe(1)

  const reloadButton = page.getByRole("button", { name: "Atualizar dados" })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()
  await expect.poll(() => responsesCalls).toBe(2)
})

test("/auditoria: carrega com filtros padrao (sem funil selecionado) usando rpc_lead_audit_fast", async ({ page }) => {
  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  let auditCalls = 0
  let countCalls = 0
  let summaryCalls = 0
  await page.route("**/rest/v1/rpc/rpc_lead_audit_fast*", (route) => {
    auditCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**/rest/v1/rpc/rpc_lead_audit_count_fast*", (route) => {
    countCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "0" })
  })
  await page.route("**/rest/v1/rpc/rpc_lead_audit_summary_fast*", (route) => {
    summaryCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.goto("/auditoria")

  await expect.poll(() => auditCalls).toBeGreaterThan(0)
  await expect.poll(() => countCalls).toBeGreaterThan(0)
  await expect.poll(() => summaryCalls).toBeGreaterThan(0)
  await expect(page.getByText("Não foi possível carregar auditoria.")).toHaveCount(0)
})

test("/auditoria: botao de reload dispara refetch via rpc_lead_audit_fast", async ({ page }) => {
  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  let auditCalls = 0
  await page.route("**/rest/v1/rpc/rpc_lead_audit_fast*", (route) => {
    auditCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })
  await page.route("**/rest/v1/rpc/rpc_lead_audit_count_fast*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "0" })
  )
  await page.route("**/rest/v1/rpc/rpc_lead_audit_summary_fast*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  await page.goto("/auditoria")
  await expect.poll(() => auditCalls).toBe(1)

  const reloadButton = page.getByRole("button", { name: "Atualizar dados" })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()
  await expect.poll(() => auditCalls).toBe(2)
})
