import { test, expect } from "@playwright/test"

const CRM_PROJECT_REF = "lcylofpnwlwaicewhsfl"

function buildCrmSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token: "test-crm-access-token",
    refresh_token: "test-refresh-token",
    expires_at: expiresAt,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "00000000-0000-0000-0000-000000000000",
      email: "crm-account@example.com",
      app_metadata: { dashboard_role: "crm" },
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    },
  }
}

async function mockCrmSession(page: import("@playwright/test").Page) {
  await page.addInitScript(
    ({ projectRef, session }) => {
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: CRM_PROJECT_REF, session: buildCrmSession() }
  )
}

async function mockUsuariosRpcs(page: import("@playwright/test").Page) {
  await page.route("**/rest/v1/rpc/admin_users_list*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          email: "aluno.real@example.com",
          nome_completo: "Aluno Real",
          tier: "mvp",
          role: "user",
          is_active: true,
          objective: "Crescer",
          age: 31,
          sex: "Homem",
          created_at: "2026-08-13T10:00:00.000Z",
          last_seen_at: "2026-08-13T11:00:00.000Z",
          access_status: "trinca",
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_users_revenue_rank*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          email: "aluno.real@example.com",
          nome_completo: "Aluno Real",
          tier: "mvp",
          access_status: "trinca",
          revenue_net_cents: 29700,
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_app_settings_current*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ reassessment_days: 45 }]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_user_detail*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          user_profile: {
            user_id: "11111111-1111-4111-8111-111111111111",
            email: "aluno.real@example.com",
            nome_completo: "Aluno Real",
            tier: "mvp",
            role: "user",
            is_active: true,
            objetivo: "Crescer",
            idade: 31,
            peso_kg: 82,
            altura_cm: 178,
            sexo: "Homem",
            access_status: "trinca",
          },
          latest_quiz_response: null,
          current_program: null,
          workout_rollup: null,
          finance_rollup: { purchase_count: 1, revenue_net_cents: 29700 },
          depends_on_future_rollups: false,
        },
      ]),
    })
  )
}

test.describe("Story 15.5 — Usuarios e Liberar Usuario reais", () => {
  test("Usuarios carrega contratos admin_* reais e aplica reavaliacao via worker com Idempotency-Key", async ({
    page,
  }) => {
    await mockCrmSession(page)
    await mockUsuariosRpcs(page)

    let reassessmentHeaders: Record<string, string> | null = null
    await page.route("**/admin/settings/reassessment", async (route) => {
      reassessmentHeaders = route.request().headers()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reassessmentDays: 60, updatedAt: "2026-08-13T12:00:00.000Z" }),
      })
    })

    await page.goto("/crm/usuarios")

    await expect(page.getByText("Aluno Real")).toBeVisible()
    await expect(page.getByText("R$ 297,00").first()).toBeVisible()

    await page.getByRole("spinbutton").fill("60")
    await page.getByRole("button", { name: /aplicar/i }).click()

    expect(reassessmentHeaders?.authorization).toBe("Bearer test-crm-access-token")
    expect(reassessmentHeaders?.["idempotency-key"]).toBeTruthy()
  })

  test("Liberar Usuario busca, cria, libera e gera senha temporaria via contratos reais", async ({ page }) => {
    await mockCrmSession(page)

    const mutationHeaders: string[] = []
    await page.route("**/rest/v1/rpc/admin_user_lookup_by_email*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            user_id: "22222222-2222-4222-8222-222222222222",
            email: "existente@example.com",
            nome_completo: "Aluno Existente",
            tier: "mvp",
            role: "user",
            is_active: true,
            access_status: "trinca",
            revenue_net_cents: 29700,
            created_at: "2026-08-13T10:00:00.000Z",
          },
        ]),
      })
    )
    await page.route("**/admin/users", async (route) => {
      mutationHeaders.push(route.request().headers()["idempotency-key"] ?? "")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: "33333333-3333-4333-8333-333333333333",
          email: "novo@example.com",
          nomeCompleto: "Novo Aluno",
          tier: "mvp",
          role: "user",
          isActive: true,
        }),
      })
    })
    await page.route("**/admin/users/*/release", async (route) => {
      mutationHeaders.push(route.request().headers()["idempotency-key"] ?? "")
      const isNewUserRelease = route.request().url().includes("33333333-3333-4333-8333-333333333333")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          userId: isNewUserRelease
            ? "33333333-3333-4333-8333-333333333333"
            : "22222222-2222-4222-8222-222222222222",
          email: isNewUserRelease ? "novo@example.com" : "existente@example.com",
          nomeCompleto: isNewUserRelease ? "Novo Aluno" : "Aluno Existente",
          tier: isNewUserRelease ? "mvp" : "elite",
          role: "user",
          isActive: true,
        }),
      })
    })
    await page.route("**/admin/users/*/password-temp", async (route) => {
      mutationHeaders.push(route.request().headers()["idempotency-key"] ?? "")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "issued", temporaryPassword: "SenhaTemp123" }),
      })
    })

    await page.goto("/crm/liberar-usuario")

    await page.getByPlaceholder("Nome do aluno").fill("Novo Aluno")
    await page.getByPlaceholder("aluno@email.com").fill("novo@example.com")
    await page.getByRole("button", { name: /criar e liberar/i }).click()
    await expect(page.getByText("Usuário criado e liberado: novo@example.com")).toBeVisible()

    await page.getByPlaceholder("buscar@email.com").fill("existente@example.com")
    await page.getByPlaceholder("buscar@email.com").press("Enter")
    await expect(page.getByText("Aluno Existente")).toBeVisible()

    await page.getByRole("button", { name: "Elite" }).click()
    await page.getByRole("button", { name: /liberar acesso/i }).click()
    await page.getByRole("button", { name: /gerar senha/i }).click()
    await expect(page.locator('input[value="SenhaTemp123"]')).toBeVisible()

    expect(mutationHeaders).toHaveLength(4)
    expect(mutationHeaders.every(Boolean)).toBe(true)
  })
})
