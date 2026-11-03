import { test, expect, type Page } from "@playwright/test"

// Story 19.12 (treino-trinca-app): fatia, pesado e complexo editáveis na tela Exercícios. API mockada.
const CRM_PROJECT_REF = "lcylofpnwlwaicewhsfl"

async function mockCrmSession(page: Page) {
  const session = {
    access_token: "test-crm-access-token",
    refresh_token: "test-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
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
  await page.addInitScript(
    ({ projectRef, value }) => window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(value)),
    { projectRef: CRM_PROJECT_REF, value: session },
  )
}

const LINHA = {
  exercise_id: "ex-martelo",
  slug: "rosca_martelo",
  nome: "Rosca martelo",
  grupo_muscular: "Bíceps",
  equipamento: "Halter",
  video_url: null,
  instrucao_texto: null,
  is_active: true,
  sexo: null,
  cursor_nome: "Rosca martelo",
  cursor_exercise_id: "ex-martelo",
}

const MATRIZ = {
  regioes: ["ombro", "joelho", "lombar", "cotovelo_punho", "quadril"],
  fatiasPorGrupo: { Bíceps: ["biceps_cabeca_longa", "biceps_braquial", "biceps_cabeca_curta"] },
  exercicios: [
    {
      exerciseId: "ex-martelo",
      slug: "rosca_martelo",
      nome: "Rosca martelo",
      grupoMuscular: "Bíceps",
      equipamento: "Halter",
      fatias: ["biceps_braquial"],
      pesado: false,
      complexo: false,
      queimacao: false,
      playbookStatus: "proposto",
      playbookFonte: "regras",
      tipo: "isolador",
      dificuldade: "iniciante",
      regioesTrabalhadas: ["biceps"],
      pendente: false,
      riscos: [],
      riscosOrigem: null,
      riscosEditadoEm: null,
      riscosEditadoPor: null,
    },
  ],
}

async function abrirEdicao(page: Page, extra?: (page: Page) => Promise<void>) {
  await mockCrmSession(page)
  await page.route("**/rest/v1/rpc/admin_exercises_list*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([LINHA]) }),
  )
  await page.route("**/admin/exercises/injury-matrix", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MATRIZ) }),
  )
  if (extra) await extra(page)
  await page.goto("/crm/exercicios")
  await expect(page.getByText("Rosca martelo").first()).toBeVisible()
  await page.getByRole("button", { name: "Editar" }).first().click()
  await expect(page.getByTestId("secao-playbook")).toBeVisible()
}

test.describe("Exercícios: fatia, pesado e complexo", () => {
  test("mostra a fatia atual, o selo de origem e as opções do grupo", async ({ page }) => {
    await abrirEdicao(page)
    const secao = page.getByTestId("secao-playbook")
    await expect(secao.getByRole("checkbox", { name: /Fatia Biceps braquial/ })).toBeChecked()
    await expect(secao.getByRole("checkbox", { name: /Fatia Biceps cabeca curta/ })).not.toBeChecked()
    await expect(secao.getByRole("checkbox", { name: /^Pesado/ })).not.toBeChecked()
    await expect(secao.getByRole("checkbox", { name: /^Complexo/ })).not.toBeChecked()
    await expect(secao.getByText("proposta", { exact: true })).toBeVisible()
  })

  test("salvar envia o PATCH dos dados básicos e o PUT do playbook com fatia, pesado e complexo", async ({ page }) => {
    const chamadas: string[] = []
    let corpoPlaybook: unknown = null
    await abrirEdicao(page, async (p) => {
      await p.route("**/admin/exercises/ex-martelo", (route) => {
        chamadas.push("PATCH")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ exerciseId: "ex-martelo", slug: "rosca_martelo", nome: "Rosca martelo", grupoMuscular: "Bíceps", equipamento: "Halter", videoUrl: null, instrucaoTexto: null, isActive: true, sexo: null }),
        })
      })
      await p.route("**/admin/exercises/ex-martelo/playbook-metadata", (route) => {
        chamadas.push("PUT")
        corpoPlaybook = route.request().postDataJSON()
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ exerciseId: "ex-martelo", fatias: ["biceps_braquial", "biceps_cabeca_curta"], pesado: false, complexo: true, playbookStatus: "revisado", playbookFonte: "humano" }),
        })
      })
    })
    const secao = page.getByTestId("secao-playbook")
    await secao.getByRole("checkbox", { name: /Fatia Biceps cabeca curta/ }).click()
    await secao.getByRole("checkbox", { name: /^Complexo/ }).click()
    await page.getByRole("button", { name: "Salvar exercício" }).click()
    await expect.poll(() => chamadas).toEqual(["PATCH", "PUT"])
    expect(corpoPlaybook).toEqual({ fatias: ["biceps_braquial", "biceps_cabeca_curta"], pesado: false, complexo: true, queimacao: false, tipo: "isolador", dificuldade: "iniciante", regioesTrabalhadas: ["biceps"] })
  })

  test("sem mudança no playbook, salvar não chama o PUT", async ({ page }) => {
    const chamadas: string[] = []
    await abrirEdicao(page, async (p) => {
      await p.route("**/admin/exercises/ex-martelo", (route) => {
        chamadas.push("PATCH")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ exerciseId: "ex-martelo", slug: "rosca_martelo", nome: "Rosca martelo", grupoMuscular: "Bíceps", equipamento: "Halter", videoUrl: null, instrucaoTexto: null, isActive: true, sexo: null }),
        })
      })
      await p.route("**/admin/exercises/ex-martelo/playbook-metadata", (route) => {
        chamadas.push("PUT")
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
      })
    })
    await page.getByRole("button", { name: "Salvar exercício" }).click()
    await expect.poll(() => chamadas.length).toBeGreaterThan(0)
    await page.waitForTimeout(500)
    expect(chamadas).toEqual(["PATCH"])
  })

  test("erro do PUT mantém a tela aberta e avisa que os dados básicos foram salvos", async ({ page }) => {
    await abrirEdicao(page, async (p) => {
      await p.route("**/admin/exercises/ex-martelo", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ exerciseId: "ex-martelo", slug: "rosca_martelo", nome: "Rosca martelo", grupoMuscular: "Bíceps", equipamento: "Halter", videoUrl: null, instrucaoTexto: null, isActive: true, sexo: null }),
        }),
      )
      await p.route("**/admin/exercises/ex-martelo/playbook-metadata", (route) =>
        route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "forbidden", message: "Admin access required" }) }),
      )
    })
    await page.getByTestId("secao-playbook").getByRole("checkbox", { name: /^Pesado/ }).click()
    await page.getByRole("button", { name: "Salvar exercício" }).click()
    await expect(page.getByText("Dados básicos salvos, mas a classificação")).toBeVisible()
  })
})


const LINHA_NOVA = {
  exercise_id: "ex-novo",
  slug: "rosca_nova",
  nome: "Rosca nova",
  grupo_muscular: "Bíceps",
  equipamento: "Halter",
  video_url: null,
  instrucao_texto: null,
  is_active: true,
  sexo: null,
  cursor_nome: "Rosca nova",
  cursor_exercise_id: "ex-novo",
}

const RESPOSTA_CRIACAO = { exerciseId: "ex-novo", slug: "rosca_nova", nome: "Rosca nova", grupoMuscular: "Bíceps", equipamento: "Halter", videoUrl: null, instrucaoTexto: null, isActive: true, sexo: null }

async function abrirNovo(page: Page, chamadas: Array<{ metodo: string; url: string; corpo: unknown }>) {
  await mockCrmSession(page)
  await page.route("**/rest/v1/rpc/admin_exercises_list*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([LINHA, LINHA_NOVA].slice(0, 1)) }),
  )
  await page.route("**/admin/exercises/injury-matrix", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MATRIZ) }),
  )
  await page.route("**/admin/exercises", (route) => {
    chamadas.push({ metodo: route.request().method(), url: route.request().url(), corpo: route.request().postDataJSON() })
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RESPOSTA_CRIACAO) })
  })
  await page.route("**/admin/exercises/ex-novo/**", (route) => {
    chamadas.push({ metodo: route.request().method(), url: route.request().url(), corpo: route.request().postDataJSON() })
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  })
  await page.goto("/crm/exercicios")
  await expect(page.getByText("Rosca martelo").first()).toBeVisible()
  await page.getByRole("button", { name: "Novo Exercício" }).click()
  await page.getByLabel(/^Nome/).fill("Rosca nova")
  await page.getByLabel(/^Grupo muscular/).fill("Bíceps")
  await expect(page.getByTestId("secao-playbook")).toBeVisible()
}

test.describe("Exercício novo: nasce pendente até ser classificado", () => {
  test("cadastro completo envia o exercício, a classificação e os riscos de lesão", async ({ page }) => {
    const chamadas: Array<{ metodo: string; url: string; corpo: unknown }> = []
    await abrirNovo(page, chamadas)
    const secao = page.getByTestId("secao-playbook")
    await secao.getByLabel("Tipo do exercício").selectOption("isolador")
    await secao.getByLabel("Dificuldade").selectOption("iniciante")
    await secao.getByRole("checkbox", { name: /Fatia Biceps braquial/ }).click()
    await secao.getByRole("checkbox", { name: /Região Bíceps/ }).click()
    await secao.getByRole("checkbox", { name: /Evitar em lesão de cotovelo e punho/ }).click()
    await page.getByRole("button", { name: "Salvar exercício" }).click()
    await expect.poll(() => chamadas.map((c) => `${c.metodo} ${new URL(c.url).pathname.replace("/admin/exercises", "")}`)).toEqual([
      "POST ",
      "PUT /ex-novo/playbook-metadata",
      "PUT /ex-novo/injury-risks",
    ])
    expect(chamadas[1]?.corpo).toEqual({
      fatias: ["biceps_braquial"],
      pesado: false,
      complexo: false,
      queimacao: false,
      tipo: "isolador",
      dificuldade: "iniciante",
      regioesTrabalhadas: ["biceps"],
    })
    expect(chamadas[2]?.corpo).toEqual({ riscos: ["cotovelo_punho"] })
  })

  test("cadastro incompleto cria o exercício, não classifica e avisa que ficou pendente", async ({ page }) => {
    const chamadas: Array<{ metodo: string; url: string; corpo: unknown }> = []
    await abrirNovo(page, chamadas)
    await expect(page.getByRole("note")).toContainText("falta: tipo, dificuldade, regiões trabalhadas")
    await page.getByRole("button", { name: "Salvar exercício" }).click()
    await expect(page.getByText(/foi criado como pendente/)).toBeVisible()
    expect(chamadas.map((c) => c.metodo)).toEqual(["POST"])
  })

  test("a lista mostra o selo pendente e o filtro 'Aguardando classificação' esconde os já classificados", async ({ page }) => {
    await mockCrmSession(page)
    const pendente = { ...MATRIZ.exercicios[0], exerciseId: "ex-pend", nome: "Rosca pendente", pendente: true, playbookFonte: null }
    await page.route("**/rest/v1/rpc/admin_exercises_list*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([LINHA, { ...LINHA, exercise_id: "ex-pend", slug: "rosca_pendente", nome: "Rosca pendente", cursor_nome: "Rosca pendente", cursor_exercise_id: "ex-pend" }]),
      }),
    )
    await page.route("**/admin/exercises/injury-matrix", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...MATRIZ, exercicios: [MATRIZ.exercicios[0], pendente] }) }),
    )
    await page.goto("/crm/exercicios")
    await expect(page.getByText("Rosca pendente").first()).toBeVisible()
    await expect(page.getByText("Pendente de classificação")).toHaveCount(1)
    await page.getByLabel("Aguardando classificação").check()
    await expect(page.getByText("Rosca martelo")).toHaveCount(0)
    await expect(page.getByText("Rosca pendente").first()).toBeVisible()
  })
})
