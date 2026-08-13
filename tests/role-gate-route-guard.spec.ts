import { test, expect } from "@playwright/test"

// Story 15.4 — role gate "crm" na camada de rota protegida (bloqueio por URL
// direta). Segunda camada do role gate do Epic 15, independente da Story
// 15.3 (que só esconde item de sidebar). Mesmo padrão de mock de sessão de
// tests/role-gate-sidebar.spec.ts.

const TRAFFIC_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const CRM_PROJECT_REF = "lcylofpnwlwaicewhsfl"
const TEAM_EMAIL = "time.melhorversao@gmail.com"

function buildSession(email: string, appMetadata: Record<string, unknown> = {}) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_at: expiresAt,
    expires_in: 3600,
    token_type: "bearer",
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

async function mockRpcs(page: import("@playwright/test").Page) {
  await page.route("**/rest/v1/rpc/rpc_dashboard_filter_options*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
  await page.route("**/rest/v1/rpc/rpc_campaign_roi*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  )
}

async function mockTrafficSession(
  page: import("@playwright/test").Page,
  email: string,
  appMetadata: Record<string, unknown> = {}
) {
  await page.addInitScript(
    ({ projectRef, session }) => {
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: TRAFFIC_PROJECT_REF, session: buildSession(email, appMetadata) }
  )
}

async function mockCrmSession(page: import("@playwright/test").Page) {
  await page.addInitScript(
    ({ projectRef, session }) => {
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    {
      projectRef: CRM_PROJECT_REF,
      session: buildSession("crm-account@example.com", { dashboard_role: "crm" }),
    }
  )
}

test.describe("Story 15.4 — role gate na rota protegida (bloqueio por URL direta)", () => {
  test("conta crm acessando rota de tráfego por URL direta é redirecionada pra home do grupo crm", async ({
    page,
  }) => {
    await mockCrmSession(page)
    await mockRpcs(page)
    await page.goto("/roi-campanhas")

    await expect(page).toHaveURL(/\/crm\/usuarios$/)
  })

  test("conta de tráfego acessando rota crm por URL direta é redirecionada pra home do grupo tráfego", async ({
    page,
  }) => {
    await mockTrafficSession(page, TEAM_EMAIL)
    await mockRpcs(page)
    await page.goto("/crm/usuarios")

    await expect(page).toHaveURL(/\/roi-campanhas$/)
  })

  test("crm/relatorios escondido redireciona conta de tráfego pra home do grupo tráfego", async ({
    page,
  }) => {
    await mockTrafficSession(page, TEAM_EMAIL)
    await mockRpcs(page)
    await page.goto("/crm/relatorios")

    await expect(page).toHaveURL(/\/roi-campanhas$/)
  })

  test("crm/relatorios escondido redireciona conta crm pra home CRM", async ({ page }) => {
    await mockCrmSession(page)
    await mockRpcs(page)
    await page.goto("/crm/relatorios")

    await expect(page).toHaveURL(/\/crm\/usuarios$/)
  })

  test("paginas CRM com backend cortado redirecionam sem renderizar dado fabricado", async ({
    page,
  }) => {
    await mockCrmSession(page)
    await mockRpcs(page)

    for (const path of ["/crm/dashboard", "/crm/conquistas"]) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/crm\/usuarios$/)
      await expect(page.getByText("Total usuários")).toHaveCount(0)
      await expect(page.getByText("Nova conquista")).toHaveCount(0)
      await expect(page.getByText("Análise completa do sistema")).toHaveCount(0)
    }
  })

  test("conta fora de isAllowedTeamUser vai pra /login independente de role (regressão)", async ({
    page,
  }) => {
    await mockTrafficSession(page, "nao-autorizado@example.com")
    await mockRpcs(page)
    await page.goto("/crm/usuarios")

    await expect(page).toHaveURL(/\/login$/)
  })
})
