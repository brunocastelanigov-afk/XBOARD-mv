import { test, expect } from "@playwright/test"

// Story 15.3 — role gate "crm" na sidebar. Generaliza o padrão de
// campaign-roi-tiktok-role.spec.ts (Story 1.4) para a role "crm" (Story
// 15.1 Decisão 2), que autentica no Supabase do app via um segundo client
// (supabaseCrm, Story 15.2), não no Supabase de campanhas.

const TRAFFIC_PROJECT_REF = "zcaypxqrteoedzbdmagm"
const CRM_PROJECT_REF = "lcylofpnwlwaicewhsfl"
const TEAM_EMAIL = "time.melhorversao@gmail.com"

const CRM_ITEMS = [
  "Usuários",
  "Protocolos",
  "Exercícios",
  "Avaliação",
  "Sugestões",
  "Regras",
  "Liberar usuário",
  "Configurações",
]

const HIDDEN_BACKEND_CUT_ITEMS = ["Dashboard", "Conquistas", "Relatórios"]

const TRAFFIC_ITEMS = [
  "ROI de Campanhas",
  "Respostas",
  "Resultados",
  "Performance Geral",
  "Auditoria de Leads",
]

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
  appMetadata: Record<string, unknown> = {}
) {
  await page.addInitScript(
    ({ projectRef, session }) => {
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: TRAFFIC_PROJECT_REF, session: buildSession(TEAM_EMAIL, appMetadata) }
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

test.describe("Story 15.3 — role gate na sidebar", () => {
  test("conta com dashboard_role=crm vê só o grupo CRM, nenhum item de tráfego", async ({
    page,
  }) => {
    await mockCrmSession(page)
    await mockRpcs(page)
    await page.goto("/crm/dashboard")

    const sidebarButtons = page.locator("[data-sidebar='menu-button']")
    const texts = await sidebarButtons.allTextContents()

    for (const item of CRM_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(true)
    }
    for (const item of TRAFFIC_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(false)
    }
    for (const item of HIDDEN_BACKEND_CUT_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(false)
    }
  })

  test("conta sem dashboard_role vê só o grupo de tráfego, nenhum item CRM", async ({
    page,
  }) => {
    await mockTrafficSession(page)
    await mockRpcs(page)
    await page.goto("/roi-campanhas")

    const sidebarButtons = page.locator("[data-sidebar='menu-button']")
    const texts = await sidebarButtons.allTextContents()

    for (const item of TRAFFIC_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(true)
    }
    for (const item of CRM_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(false)
    }
    for (const item of HIDDEN_BACKEND_CUT_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(false)
    }
  })

  test("conta tiktok_only continua vendo só o grupo de tráfego (regressão, sem mudança de comportamento)", async ({
    page,
  }) => {
    await mockTrafficSession(page, { dashboard_role: "tiktok_only" })
    await mockRpcs(page)
    await page.goto("/roi-campanhas")

    const sidebarButtons = page.locator("[data-sidebar='menu-button']")
    const texts = await sidebarButtons.allTextContents()

    for (const item of TRAFFIC_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(true)
    }
    for (const item of CRM_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(false)
    }
    for (const item of HIDDEN_BACKEND_CUT_ITEMS) {
      expect(texts.some((t) => t.includes(item))).toBe(false)
    }
  })
})
