import { test, expect } from "@playwright/test"

// Problema 03 — Critério de aceite original: pooling de 1 minuto validado com timers
// controlados (page.clock, sem esperar 60s reais) + botão de reload validado via
// Playwright, disparando um refetch imediato.
//
// Atualização (2026-07-28): o polling automático de 60s foi removido a pedido do
// stakeholder (carga desnecessária em escala) -- ver docs/sessions/2026-07/
// 2026-07-28-funnel-performance-rollup.md. O dashboard agora só busca dados no
// carregamento inicial e no clique manual do botão de reload. Este arquivo foi
// atualizado para refletir esse comportamento; os testes de polling automático
// foram removidos porque o mecanismo que eles validavam não existe mais.

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

test("sem polling automatico: rpc_campaign_roi so e chamada uma vez no carregamento, mesmo apos 5 minutos parados", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-07-27T12:00:00Z") })

  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  let campaignRoiCalls = 0
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) => {
    campaignRoiCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.goto("/roi-campanhas")
  await expect.poll(() => campaignRoiCalls).toBe(1)

  // Antes: um poll automático a cada 60s disparava novos fetches sozinho.
  // Depois: nada dispara sem interação do usuário, nem depois de 5 minutos.
  await page.clock.fastForward(5 * 60_000)
  await expect.poll(() => campaignRoiCalls).toBe(1)

  // Botão de reload continua funcionando: clique manual dispara um refetch imediato.
  const reloadButton = page.getByRole("button", { name: "Atualizar dados" })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()
  await expect.poll(() => campaignRoiCalls).toBe(2)

  // E depois do clique também não volta a pollar sozinho.
  await page.clock.fastForward(5 * 60_000)
  await expect.poll(() => campaignRoiCalls).toBe(2)
})

test("reload não trava com clique duplo (aborta a requisição anterior antes de disparar a nova)", async ({ page }) => {
  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  await page.goto("/roi-campanhas")

  const reloadButton = page.getByRole("button", { name: "Atualizar dados" })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()
  await reloadButton.click()

  await expect(page.getByText("Não foi possível carregar ROI de campanhas.")).toHaveCount(0)
})

test("performance.tsx: reload dispara o refresh da rollup antes de rebuscar os dados", async ({ page }) => {
  // Cobre a mudança da story de otimização de leitura (2026-07-28): o botão de
  // reload agora chama refresh_funnel_performance_rollups() via RPC antes do
  // refetch normal -- best-effort, não deve travar o reload se falhar.
  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )

  const emptyArrayRoutes = [
    "rpc_performance",
    "rpc_campaign_performance",
    "rpc_device_performance",
    "rpc_step_results",
  ]
  for (const rpcName of emptyArrayRoutes) {
    await page.route(`**/rest/v1/rpc/${rpcName}*`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    )
  }

  let refreshCalls = 0
  await page.route("**/rest/v1/rpc/refresh_funnel_performance_rollups*", (route) => {
    refreshCalls += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: "null" })
  })

  await page.goto("/performance")

  // Carregamento inicial não deve chamar o refresh -- só o clique manual.
  await expect.poll(() => refreshCalls).toBe(0)

  const reloadButton = page.getByRole("button", { name: "Atualizar dados" })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()

  await expect.poll(() => refreshCalls).toBe(1)
  await expect(page.getByText("Não foi possível carregar performance.")).toHaveCount(0)
})

test("performance.tsx: reload não trava se o refresh da rollup falhar (best-effort)", async ({ page }) => {
  await mockAuth(page)

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  const emptyArrayRoutes = [
    "rpc_performance",
    "rpc_campaign_performance",
    "rpc_device_performance",
    "rpc_step_results",
  ]
  for (const rpcName of emptyArrayRoutes) {
    await page.route(`**/rest/v1/rpc/${rpcName}*`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    )
  }
  await page.route("**/rest/v1/rpc/refresh_funnel_performance_rollups*", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"boom"}' })
  )

  await page.goto("/performance")

  const reloadButton = page.getByRole("button", { name: "Atualizar dados" })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()
  await reloadButton.click()

  // O refresh falhando não deve impedir a página de continuar funcionando.
  await expect(page.getByText("Não foi possível carregar performance.")).toHaveCount(0)
})
