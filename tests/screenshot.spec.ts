import { test } from "@playwright/test"

const SUPABASE_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const TEAM_EMAIL = "time.melhorversao@gmail.com"

async function mockAuthAndRpcs(page: any) {
  await page.route(`https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/user`, (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "mock-user-id",
        aud: "authenticated",
        role: "authenticated",
        email: TEAM_EMAIL,
        app_metadata: { provider: "email" },
        user_metadata: {},
      }),
    })
  )

  await page.route(`https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/session`, (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-jwt",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: { email: TEAM_EMAIL },
      }),
    })
  )
  
  await page.evaluate(() => {
    localStorage.setItem(
      "sb-zcaypxqrteoedzbdmagm-auth-token",
      JSON.stringify({
        access_token: "mock-jwt",
        token_type: "bearer",
        user: { email: "time.melhorversao@gmail.com" },
      })
    )
  })

  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  )

  await page.route("**/rest/v1/rpc/rpc_performance*", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          funnel_id: "test",
          country: "BR",
          funnel_variant: "a",
          event_date: "2026-07-24",
          visitors: 1000,
          responses_started: 800,
          leads: 400,
          conclusions: 150,
          average_time_seconds: 120,
          score: 85
        }
      ]),
    })
  )

  await page.route("**/rest/v1/rpc/rpc_campaign_performance*", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  )
  
  await page.route("**/rest/v1/rpc/rpc_device_performance*", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  )

  await page.route("**/rest/v1/rpc/rpc_step_results*", (route: any) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          step_number: 1,
          step_name: "Página Principal",
          entries: 1000,
          first_step_entries: 1000
        },
        {
          step_number: 2,
          step_name: "Quiz Sexo",
          entries: 800,
          first_step_entries: 1000
        },
        {
          step_number: 3,
          step_name: "Quiz Idade",
          entries: 600,
          first_step_entries: 1000
        },
        {
          step_number: 4,
          step_name: "Captura Email",
          entries: 400,
          first_step_entries: 1000
        }
      ]),
    })
  )
}

test("take dashboard screenshot", async ({ page }) => {
  await page.goto("/") // populate localstorage early
  await mockAuthAndRpcs(page)
  await page.goto("/performance")
  // wait for the page to render fully
  await page.waitForTimeout(1000)
  await page.screenshot({ path: "docs/screenshots/dashboard-performance-story14.png", fullPage: true })
})
