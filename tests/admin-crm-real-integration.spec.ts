import { expect, test, type Page } from "@playwright/test"

const CRM_PROJECT_REF = "lcylofpnwlwaicewhsfl"

function buildCrmSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  return {
    access_token: "crm-test-token",
    refresh_token: "crm-test-refresh-token",
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

async function mockCommonAdminReads(page: Page) {
  await page.route("**/rest/v1/rpc/admin_banners_list*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          banner_id: "banner-1",
          plano: "elite",
          ordem: 1,
          imagem_url: "https://cdn.example.com/banner.jpg",
          link: "/upsell",
          ativo: true,
          created_at: "2026-08-13T00:00:00.000Z",
          updated_at: "2026-08-13T00:00:00.000Z",
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_classification_rules_list*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          rule_id: "rule-1",
          nome: "Override por idade",
          descricao: "Força iniciante para idade >= 55.",
          prioridade: 1,
          condicoes: [{ campo: "idade", operador: "gte", valor: "55" }],
          nivel_resultado: "iniciante",
          override: true,
          ativo: true,
          created_at: "2026-08-13T00:00:00.000Z",
          updated_at: "2026-08-13T00:00:00.000Z",
        },
      ]),
    })
  )
  await page.route("**/rest/v1/admin_quiz_fields*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { campo: "genero", label: "Gênero", tipo: "string", valores_permitidos: ["Homem", "Mulher"] },
        { campo: "idade", label: "Idade", tipo: "number", valores_permitidos: null },
        { campo: "experiencia", label: "Experiência", tipo: "string", valores_permitidos: ["Iniciante", "Experiente"] },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_protocol_templates_tree*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          template_id: "template-1",
          nivel: "iniciante",
          objetivo: "ganhar_musculo",
          nome: "Treino Iniciante - Crescer",
          descricao: "Contrato real de template",
          categoria: "A",
          etiqueta: "PROTOCOLO A",
          duracao_minutos: 45,
          status: "ativo",
          versao: 1,
          released_at: "2026-08-13T00:00:00.000Z",
          created_at: "2026-08-13T00:00:00.000Z",
          days: [
            {
              day_id: "day-1",
              ordem: 1,
              nome: "Treino 1",
              descricao: null,
              duracao_minutos: 45,
              exercises: [
                {
                  prescription_id: "prescription-1",
                  ordem: 1,
                  exercise_id: "exercise-1",
                  nome: "Agachamento",
                  series: 3,
                  reps_ou_duracao: "12",
                  descanso_segundos: 60,
                },
              ],
            },
          ],
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_user_programs_list*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          user_id: "11111111-1111-1111-1111-111111111111",
          email: "aluno@example.com",
          nome_completo: "Aluno Real",
          tier: "elite",
          access_status: "elite",
          has_program: true,
          program_id: "program-1",
          program_nome: "Programa atual",
          program_status_geracao: "completed",
          program_created_at: "2026-08-13T00:00:00.000Z",
          cursor_created_at: "2026-08-13T00:00:00.000Z",
          cursor_user_id: "11111111-1111-1111-1111-111111111111",
        },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_user_programs_stats*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { no_app: 0, com_protocolo: 1, aguardando_liberacao: 0, gerando: 0, sem_protocolo: 0 },
      ]),
    })
  )
  await page.route("**/rest/v1/rpc/admin_user_program_detail*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          user_id: "11111111-1111-1111-1111-111111111111",
          program_id: "program-1",
          program_nome: "Programa atual",
          program_foco: "Full body",
          status_geracao: "completed",
          program_created_at: "2026-08-13T00:00:00.000Z",
          days: [
            {
              workout_day_id: "workout-day-1",
              ordem: 1,
              nome: "Treino 1",
              foco: "Full body",
              status: "active",
              exercicios_snapshot: [
                {
                  exercise_id: "exercise-1",
                  nome: "Agachamento",
                  ordem: 1,
                  series: 3,
                  reps: "12",
                  descanso_segundos: 60,
                },
              ],
              exercicios: [],
            },
          ],
        },
      ]),
    })
  )
}

async function mockExerciseReads(page: Page) {
  await page.route("**/rest/v1/rpc/admin_exercises_list*", async (route) => {
    const body = route.request().postDataJSON() as {
      p_grupo_muscular?: string
      p_search_name_prefix?: string
    } | null
    const rows = [
      {
        exercise_id: "exercise-1",
        slug: "supino-reto",
        nome: "Supino reto",
        grupo_muscular: "Peito",
        equipamento: "Barra",
        video_url: "https://youtube.com/shorts/supino",
        instrucao_texto: "Desça a barra até o peito e suba com controle.",
        is_active: true,
        cursor_nome: "Supino reto",
        cursor_exercise_id: "exercise-1",
      },
      {
        exercise_id: "exercise-2",
        slug: "puxada-frontal",
        nome: "Puxada frontal",
        grupo_muscular: "Costas",
        equipamento: "Máquina",
        video_url: null,
        instrucao_texto: "Puxe a barra mantendo o tronco firme.",
        is_active: true,
        cursor_nome: "Puxada frontal",
        cursor_exercise_id: "exercise-2",
      },
    ].filter((row) => {
      const categoryMatches = !body?.p_grupo_muscular || row.grupo_muscular === body.p_grupo_muscular
      const searchMatches =
        !body?.p_search_name_prefix ||
        row.nome.toLowerCase().startsWith(body.p_search_name_prefix.toLowerCase())
      return categoryMatches && searchMatches
    })

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(rows),
    })
  })
}

test.describe("Story 15.6 — integrações reais Admin CRM", () => {
  test.beforeEach(async ({ page }) => {
    await mockCrmSession(page)
    await mockCommonAdminReads(page)
    await mockExerciseReads(page)
  })

  test("Regras carrega contratos read-only e testador chama endpoint real", async ({ page }) => {
    let testCalled = false
    await page.route("**/admin/classification-rules/test", async (route) => {
      testCalled = true
      const body = route.request().postDataJSON() as { respostas: { pergunta: string; resposta: string }[] }
      expect(body.respostas.length).toBeGreaterThan(0)
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ nivel: "iniciante", fieldValues: { idade: "60" } }),
      })
    })

    await page.goto("/crm/regras")
    await expect(page.getByText("Override por idade")).toBeVisible()
    await page.getByRole("tab", { name: /Testador/ }).click()
    await page.getByRole("button", { name: "Sênior 60 anos" }).click()
    await page.getByRole("button", { name: "Testar Classificação" }).click()

    await expect(page.getByText("Resultado: Iniciante")).toBeVisible()
    expect(testCalled).toBe(true)
  })

  test("Protocolos usa RPCs reais e mutações /admin/protocol-templates e /admin/users/:id/program", async ({
    page,
  }) => {
    let templatePatchCalled = false
    let programPatchCalled = false

    await page.route("**/admin/protocol-templates/template-1", (route) => {
      if (route.request().method() !== "PATCH") return route.fallback()
      templatePatchCalled = true
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ templateId: "template-1", nome: "Treino Iniciante - Crescer" }),
      })
    })
    await page.route("**/admin/users/11111111-1111-1111-1111-111111111111/program", (route) => {
      if (route.request().method() !== "PATCH") return route.fallback()
      programPatchCalled = true
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111", hasProgram: true }),
      })
    })

    await page.goto("/crm/protocolos")
    await expect(page.getByText("Treino Iniciante - Crescer")).toBeVisible()
    await page.getByRole("button", { name: "Editar" }).first().click()
    await page.getByRole("button", { name: "Salvar protocolo" }).click()
    await expect.poll(() => templatePatchCalled).toBe(true)

    await page.getByRole("tab", { name: /Treinos individuais/ }).click()
    await expect(page.getByText("Aluno Real")).toBeVisible()
    // Problema 02: o botão agora abre um card de escolha (protocolo vs.
    // treino) em vez de ir direto pra lista de exercícios.
    await page.getByRole("button", { name: "Editar protocolo / treino" }).click()
    await page.getByRole("button", { name: "Editar treino" }).click()
    await page.getByRole("button", { name: "Salvar treino" }).click()
    await expect.poll(() => programPatchCalled).toBe(true)
  })

  test("Problema 01 — Editar protocolo migra o aluno pra outro template via POST /program/assign", async ({
    page,
  }) => {
    let assignCalled = false
    let assignBody: { templateId?: string } | null = null

    await page.route(
      "**/admin/users/11111111-1111-1111-1111-111111111111/program/assign",
      (route) => {
        if (route.request().method() !== "POST") return route.fallback()
        assignCalled = true
        assignBody = route.request().postDataJSON() as { templateId?: string }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            userId: "11111111-1111-1111-1111-111111111111",
            hasProgram: true,
            program: {
              programId: "program-2",
              nome: "Treino Iniciante - Crescer",
              foco: null,
              statusGeracao: "pronto",
              createdAt: "2026-08-22T00:00:00.000Z",
              days: [],
            },
          }),
        })
      }
    )

    await page.goto("/crm/protocolos")
    await page.getByRole("tab", { name: /Treinos individuais/ }).click()
    await expect(page.getByText("Aluno Real")).toBeVisible()

    await page.getByRole("button", { name: "Editar protocolo / treino" }).click()
    await page.getByRole("button", { name: "Editar protocolo" }).click()
    await expect(page.getByText("Protocolo atual: Programa atual")).toBeVisible()
    await page.getByText("Treino Iniciante - Crescer").click()

    await expect.poll(() => assignCalled).toBe(true)
    expect(assignBody).toEqual({ templateId: "template-1" })
  })

  test("Exercicios usa admin_exercises_list e mutacoes reais com Idempotency-Key", async ({ page }) => {
    const mutationHeaders: string[] = []
    let postCalled = false
    let patchCalled = false
    let deleteCalled = false

    await page.route("**/admin/exercises", (route) => {
      if (route.request().method() !== "POST") return route.fallback()
      postCalled = true
      mutationHeaders.push(route.request().headers()["idempotency-key"] ?? "")
      const body = route.request().postDataJSON() as { nome: string; grupoMuscular: string }
      expect(body.nome).toBe("Remada curvada")
      expect(body.grupoMuscular).toBe("Costas")
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          exerciseId: "exercise-3",
          slug: "remada-curvada",
          nome: "Remada curvada",
          grupoMuscular: "Costas",
          equipamento: "Barra",
          videoUrl: null,
          instrucaoTexto: "Puxe a barra em direcao ao tronco.",
          isActive: true,
        }),
      })
    })
    await page.route("**/admin/exercises/exercise-1", (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true
        mutationHeaders.push(route.request().headers()["idempotency-key"] ?? "")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            exerciseId: "exercise-1",
            slug: "supino-reto",
            nome: "Supino reto ajustado",
            grupoMuscular: "Peito",
            equipamento: "Barra",
            videoUrl: "https://youtube.com/shorts/supino",
            instrucaoTexto: "Instrucao ajustada.",
            isActive: true,
          }),
        })
      }
      if (route.request().method() === "DELETE") {
        deleteCalled = true
        mutationHeaders.push(route.request().headers()["idempotency-key"] ?? "")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            exerciseId: "exercise-1",
            slug: "supino-reto",
            nome: "Supino reto ajustado",
            grupoMuscular: "Peito",
            equipamento: "Barra",
            videoUrl: "https://youtube.com/shorts/supino",
            instrucaoTexto: "Instrucao ajustada.",
            isActive: false,
            affectedTemplates: [
              {
                templateId: "template-1",
                nome: "Treino Iniciante - Crescer",
                nivel: "iniciante",
                objetivo: "ganhar_musculo",
                status: "ativo",
              },
            ],
          }),
        })
      }
      return route.fallback()
    })

    await page.goto("/crm/exercicios")
    await expect(page.getByText("Supino reto")).toBeVisible()
    await expect(page.getByText("Puxada frontal")).toBeVisible()
    await expect(page.getByRole("button", { name: "Peito" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Costas" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Ombros" })).toHaveCount(0)

    await page.getByRole("button", { name: "Peito" }).click()
    await expect(page.getByText("Supino reto")).toBeVisible()
    await expect(page.getByText("Puxada frontal")).toHaveCount(0)

    await page.getByRole("button", { name: /Editar/ }).first().click()
    await page.getByLabel(/Nome/).fill("Supino reto ajustado")
    await page.getByRole("button", { name: "Salvar exercício" }).click()
    await expect(page.getByText("Supino reto ajustado")).toBeVisible()

    await page.getByRole("button", { name: /Inativar "Supino reto ajustado"/ }).click()
    await page.getByRole("button", { name: "Inativar exercício" }).click()
    await expect(page.getByText(/Templates afetados: Treino Iniciante - Crescer/)).toBeVisible()

    await page.getByRole("button", { name: "Todos" }).click()
    await page.getByRole("button", { name: "Novo Exercício" }).click()
    await page.getByLabel(/Nome/).fill("Remada curvada")
    await page.getByLabel(/Grupo muscular/).fill("Costas")
    await page.getByLabel("Equipamento").fill("Barra")
    await page.getByRole("button", { name: "Salvar exercício" }).click()
    await expect(page.getByText("Remada curvada")).toBeVisible()

    expect(postCalled).toBe(true)
    expect(patchCalled).toBe(true)
    expect(deleteCalled).toBe(true)
    expect(mutationHeaders).toHaveLength(3)
    expect(mutationHeaders.every(Boolean)).toBe(true)
  })
})
