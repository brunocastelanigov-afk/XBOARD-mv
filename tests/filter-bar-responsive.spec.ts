import { test, expect, type Page } from "@playwright/test"

// Critério de aceite: TODOS os componentes do filtro (selects, ordenação, datas, atalhos de período
// e atualizar) ficam visíveis e dentro do cartão do filtro em qualquer viewport — nada fora da tela,
// nada cortado por overflow, sem scroll horizontal da página. Autenticação e RPCs são mockadas
// (mesmo padrão de campaign-roi.spec.ts), então o teste é determinístico e não toca dados reais.

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const TEAM_EMAIL = "time.melhorversao@gmail.com"

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]

async function mockAuthAndRpcs(page: Page) {
  await page.addInitScript(
    ({ projectRef, email }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      window.localStorage.setItem(
        `sb-${projectRef}-auth-token`,
        JSON.stringify({
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
        })
      )
    },
    { projectRef: SUPABASE_PROJECT_REF, email: TEAM_EMAIL }
  )

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { funnel_id: "desafio_treino_trinca", country: "BR", funnel_variant: "inlead", traffic_source_id: "facebook", min_event_date: "2026-01-01", max_event_date: "2026-10-01", leads: 100 },
        { funnel_id: "desafio_treino_trinca", country: "BR", funnel_variant: null, traffic_source_id: "tiktok", min_event_date: "2026-01-01", max_event_date: "2026-10-01", leads: 50 },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
}

for (const viewport of VIEWPORTS) {
  test(`filtro de ROI de campanhas inteiro visível em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockAuthAndRpcs(page)
    await page.goto("/roi-campanhas")

    const bar = page.getByTestId("filter-bar")
    await expect(bar).toBeVisible()
    // 5 selects (funil, país, variante, produto, fonte) renderizados antes de medir
    await expect(bar.getByRole("combobox")).toHaveCount(5)
    await page.waitForTimeout(300)

    const barBox = (await bar.boundingBox())!
    const controls = bar.locator('button, input, [role="combobox"]')
    const total = await controls.count()
    expect(total).toBeGreaterThanOrEqual(11) // 5 selects + ordenar + 2 datas + >=3 atalhos (+ atualizar)

    const problems: string[] = []
    for (let i = 0; i < total; i += 1) {
      const control = controls.nth(i)
      if (!(await control.isVisible())) continue
      const box = await control.boundingBox()
      if (!box) continue
      const label =
        (await control.getAttribute("aria-label")) ||
        (await control.innerText().catch(() => "")).trim().slice(0, 30) ||
        (await control.getAttribute("role")) ||
        `controle ${i}`
      const left = box.x
      const right = box.x + box.width
      if (left < -0.5 || right > viewport.width + 0.5) problems.push(`"${label}" fora da tela (x ${left.toFixed(0)}–${right.toFixed(0)} de ${viewport.width})`)
      if (left < barBox.x - 0.5 || right > barBox.x + barBox.width + 0.5) problems.push(`"${label}" fora do cartão do filtro (x ${left.toFixed(0)}–${right.toFixed(0)}, cartão ${barBox.x.toFixed(0)}–${(barBox.x + barBox.width).toFixed(0)})`)
    }

    const overflow = await page.evaluate(() => {
      const barEl = document.querySelector('[data-testid="filter-bar"]') as HTMLElement
      return {
        barOverflowX: barEl.scrollWidth - barEl.clientWidth,
        pageOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      }
    })
    if (overflow.barOverflowX > 1) problems.push(`cartão do filtro com overflow horizontal de ${overflow.barOverflowX}px`)
    if (overflow.pageOverflowX > 1) problems.push(`página com scroll horizontal de ${overflow.pageOverflowX}px`)

    await bar.screenshot({ path: `test-results/filter-bar-${viewport.width}x${viewport.height}.png` })
    expect(problems, problems.join("\n")).toEqual([])
  })
}
