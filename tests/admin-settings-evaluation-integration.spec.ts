import { expect, test, type Page } from "@playwright/test"

const CRM_PROJECT_REF = "lcylofpnwlwaicewhsfl"

function buildCrmSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token: "crm-story-15-7-token",
    refresh_token: "crm-story-15-7-refresh-token",
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

async function mockCrmSession(page: Page) {
  await page.addInitScript(
    ({ projectRef, session }) => {
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(session))
    },
    { projectRef: CRM_PROJECT_REF, session: buildCrmSession() }
  )
}

async function mockConfiguracoesReads(page: Page) {
  await page.route("**/rest/v1/rpc/admin_app_settings_current*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          app_name: "Treino Trinca",
          trinca_product_ids: ["prod-trinca"],
          elite_product_ids: ["prod-elite"],
          trinca_validity_days: 365,
          elite_validity_days: 90,
          upgrade_url: "https://checkout.example.com/upgrade",
          renewal_trinca_url: "https://checkout.example.com/trinca",
          renewal_elite_url: "https://checkout.example.com/elite",
          support_url: "https://suporte.example.com",
          reassessment_days: 45,
          depends_on_future_table: false,
          blocked_by: null,
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_lastlink_product_map*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { product_id: "prod-trinca", tier: "mvp", is_upsell: false, label: "Produto Trinca" },
        { product_id: "prod-elite", tier: "elite", is_upsell: false, label: "Produto Elite" },
      ]),
    })
  )
}

async function mockAvaliacaoReads(page: Page) {
  await page.route("**/rest/v1/rpc/admin_quiz_responses_by_user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          response_id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          user_name: "Aluno Real",
          user_email: "aluno.real@example.com",
          quiz_type: "initial",
          completed_at: "2026-08-13T12:00:00.000Z",
          answers_count: 3,
          respostas: [
            { pergunta: "Qual é o seu gênero?", resposta: "Homem" },
            { pergunta: "Qual é a sua idade?", resposta: "31" },
            { pergunta: "Qual é a sua experiência com academia?", resposta: "Intermediário" },
          ],
          cursor_completed_at: "2026-08-13T12:00:00.000Z",
          cursor_response_id: "11111111-1111-4111-8111-111111111111",
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_quiz_response_detail*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          response_id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          user_name: "Aluno Real",
          user_email: "aluno.real@example.com",
          quiz_type: "initial",
          completed_at: "2026-08-13T12:00:00.000Z",
          respostas: [
            { pergunta: "Qual é o seu gênero?", resposta: "Homem" },
            { pergunta: "Qual é a sua idade?", resposta: "31" },
            { pergunta: "Qual é a sua experiência com academia?", resposta: "Intermediário" },
          ],
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_quiz_question_stats*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          quiz_type: "initial",
          question_key: "genero",
          question_label: "Qual é o seu gênero?",
          answer_key: "homem",
          answer_label: "Homem",
          answer_count: 12,
          latest_answer_at: "2026-08-13T12:00:00.000Z",
          depends_on_rollup: false,
          blocked_by: null,
        },
        {
          quiz_type: "initial",
          question_key: "genero",
          question_label: "Qual é o seu gênero?",
          answer_key: "mulher",
          answer_label: "Mulher",
          answer_count: 18,
          latest_answer_at: "2026-08-13T12:00:00.000Z",
          depends_on_rollup: false,
          blocked_by: null,
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_quiz_analytics_summary*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          total_responses: 30,
          unique_respondents: 30,
          distinct_questions_tracked: 1,
          rollup_watermark: "2026-08-13T12:00:00.000Z",
          rollup_status: "ok",
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_suggestions_list*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          suggestion_id: "33333333-3333-4333-8333-333333333333",
          user_id: "22222222-2222-4222-8222-222222222222",
          user_name: "Aluno Real",
          user_email: "aluno.real@example.com",
          texto: "Adicionar treino de mobilidade",
          status: "nova",
          created_at: "2026-08-13T12:00:00.000Z",
          cursor_created_at: "2026-08-13T12:00:00.000Z",
          cursor_suggestion_id: "33333333-3333-4333-8333-333333333333",
        },
      ]),
    })
  )
}

test.describe("Story 15.7 — Configuracoes e Avaliacao reais", () => {
  test("Configuracoes carrega settings/mapa LastLink e salva via worker com Idempotency-Key", async ({ page }) => {
    await mockCrmSession(page)
    await mockConfiguracoesReads(page)

    const mutationHeaders: Record<string, string>[] = []
    await page.route("**/admin/settings", async (route) => {
      mutationHeaders.push(route.request().headers())
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          upgradeUrl: "https://checkout.example.com/upgrade-novo",
          renewalTrincaUrl: "https://checkout.example.com/trinca",
          renewalEliteUrl: "https://checkout.example.com/elite",
          supportUrl: "https://suporte.example.com",
          trincaValidityDays: 365,
          eliteValidityDays: 90,
          updatedAt: "2026-08-13T12:30:00.000Z",
        }),
      })
    })
    await page.route("**/admin/settings/reassessment", async (route) => {
      mutationHeaders.push(route.request().headers())
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reassessmentDays: 60, updatedAt: "2026-08-13T12:31:00.000Z" }),
      })
    })
    await page.route("**/admin/lastlink-product-map/prod-trinca", async (route) => {
      mutationHeaders.push(route.request().headers())
      expect(route.request().postDataJSON()).toEqual({
        productId: "prod-trinca-qa",
        label: "Produto Trinca QA",
      })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ productId: "prod-trinca-qa", tier: "mvp", isUpsell: false, label: "Produto Trinca QA" }),
      })
    })

    await page.goto("/crm/configuracoes")

    await expect(page.locator('input[value="Treino Trinca"]')).toBeVisible()
    await expect(page.getByText("prod-trinca").first()).toBeVisible()
    await expect(page.getByText(/app ainda não consome esse prazo/)).toBeVisible()

    await page.locator('input[value="prod-trinca"]').fill("prod-trinca-qa")
    await page.locator('input[value="Produto Trinca"]').fill("Produto Trinca QA")
    await page.getByRole("button", { name: "Salvar produto" }).first().click()

    await page.locator('input[value="https://checkout.example.com/trinca"]').fill("https://checkout.example.com/trinca-novo")
    await page.getByRole("button", { name: "Salvar configurações" }).click()

    await page.getByRole("spinbutton").last().fill("60")
    await page.getByRole("button", { name: "Aplicar" }).click()

    expect(mutationHeaders).toHaveLength(3)
    for (const headers of mutationHeaders) {
      expect(headers.authorization).toBe("Bearer crm-story-15-7-token")
      expect(headers["idempotency-key"]).toBeTruthy()
    }
  })

  test("Avaliacao usa contratos de quiz e classifica sugestao via auditoria real do worker", async ({ page }) => {
    await mockCrmSession(page)
    await mockAvaliacaoReads(page)

    let suggestionHeaders: Record<string, string> | null = null
    await page.route("**/admin/suggestions/33333333-3333-4333-8333-333333333333/status", async (route) => {
      suggestionHeaders = route.request().headers()
      expect(route.request().postDataJSON()).toEqual({ status: "revisada" })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          mutationId: "mutation-1",
          idempotencyKey: route.request().headers()["idempotency-key"],
          affectedIds: ["33333333-3333-4333-8333-333333333333"],
          suggestionStatus: "revisada",
        }),
      })
    })

    await page.goto("/crm/avaliacao")

    await expect(page.getByText("Aluno Real").first()).toBeVisible()
    await page.getByRole("button", { name: "Ver respostas" }).click()
    await expect(page.getByText("Qual é a sua experiência com academia?")).toBeVisible()
    await page.getByRole("button", { name: "Fechar" }).click()

    await page.getByRole("tab", { name: /Por Pergunta/ }).click()
    await page.getByText("Qual é o seu gênero?").click()
    await expect(page.getByText("Contagem por opção")).toBeVisible()
    await expect(page.getByText("Mulher")).toBeVisible()

    await page.getByRole("tab", { name: /Sugestões/ }).click()
    await expect(page.getByText("Adicionar treino de mobilidade")).toBeVisible()
    await page.getByRole("button", { name: "Revisada" }).click()

    expect(suggestionHeaders?.authorization).toBe("Bearer crm-story-15-7-token")
    expect(suggestionHeaders?.["idempotency-key"]).toBeTruthy()
  })
})
