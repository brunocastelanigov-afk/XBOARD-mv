import { test, expect } from "@playwright/test"

// Problema 03 — Critério de aceite: pooling de 1 minuto validado com timers controlados
// (page.clock, sem esperar 60s reais) + botão de reload validado via Playwright, disparando
// um refetch imediato e reiniciando o timer do poll (pra não empilhar dois fetches seguidos).

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

test("polling de 1 minuto e botão de reload disparam refetch de rpc_campaign_roi", async ({ page }) => {
  // Precisa ser instalado antes do goto, pra interceptar os timers usados pelo hook.
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

  // Poll automático dispara a cada 60s, sem interação do usuário.
  await page.clock.fastForward(60_000)
  await expect.poll(() => campaignRoiCalls).toBe(2)

  await page.clock.fastForward(60_000)
  await expect.poll(() => campaignRoiCalls).toBe(3)

  // Botão de reload: refetch imediato + reinicia o timer do poll.
  const reloadButton = page.getByRole("button", { name: "Atualizar dados" })
  await expect(reloadButton).toBeVisible()
  await reloadButton.click()
  await expect.poll(() => campaignRoiCalls).toBe(4)

  // 30s após o reload não deve haver novo poll (timer foi reiniciado no clique).
  await page.clock.fastForward(30_000)
  await expect.poll(() => campaignRoiCalls).toBe(4)

  // Completando 60s desde o reload, o poll deve disparar de novo.
  await page.clock.fastForward(30_000)
  await expect.poll(() => campaignRoiCalls).toBe(5)
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
