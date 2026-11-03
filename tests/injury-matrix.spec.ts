import { test, expect, type Page } from "@playwright/test"

// Story 19.12 (treino-trinca-app): matriz de lesão. A API é mockada; o que se testa é a tela.
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

const exercicio = (id: string, nome: string, grupoMuscular: string, fatias: string[], riscos: string[], riscosOrigem: string | null) => ({
  exerciseId: id,
  slug: id,
  nome,
  grupoMuscular,
  equipamento: null,
  fatias,
  riscos,
  riscosOrigem,
  riscosEditadoEm: null,
  riscosEditadoPor: null,
})

const MATRIZ = {
  regioes: ["ombro", "joelho", "lombar", "cotovelo_punho", "quadril"],
  exercicios: [
    exercicio("ex-leg-press", "Leg press", "Pernas", ["quadriceps_composto"], ["joelho"], "proposta"),
    exercicio("ex-agachamento", "Agachamento livre", "Pernas", ["quadriceps_composto"], [], "proposta"),
    exercicio("ex-extensora", "Cadeira extensora", "Pernas", ["quadriceps_isolado"], [], null),
    exercicio("ex-supino", "Supino reto", "Peito", ["peito_esternal"], ["ombro"], "humano"),
  ],
}

async function abrir(page: Page, put?: (route: import("@playwright/test").Route) => Promise<void>) {
  await mockCrmSession(page)
  await page.route("**/admin/exercises/injury-matrix", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MATRIZ) }),
  )
  if (put) await page.route("**/admin/exercises/*/injury-risks", put)
  await page.goto("/crm/lesoes")
  await expect(page.getByText("Matriz de lesão").first()).toBeVisible()
}

test.describe("Matriz de lesão", () => {
  test("lista os exercícios com as regiões já marcadas e a origem de cada um", async ({ page }) => {
    await abrir(page)
    await expect(page.getByLabel("Leg press: evitar em lesão de joelho")).toBeChecked()
    await expect(page.getByLabel("Leg press: evitar em lesão de ombro")).not.toBeChecked()
    await expect(page.getByLabel("Supino reto: evitar em lesão de ombro")).toBeChecked()
    await expect(page.getByText("humano", { exact: true })).toBeVisible()
    await expect(page.getByText("proposta", { exact: true }).first()).toBeVisible()
  })

  test("marcar uma região envia PUT com a lista nova, com Idempotency-Key, e mostra o aviso", async ({ page }) => {
    let corpo: unknown = null
    let chave: string | undefined
    await abrir(page, async (route) => {
      corpo = route.request().postDataJSON()
      chave = route.request().headers()["idempotency-key"]
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ exerciseId: "ex-agachamento", riscos: ["lombar"], riscosOrigem: "humano", riscosEditadoEm: "2026-11-03T10:00:00.000Z" }),
      })
    })
    await page.getByLabel("Agachamento livre: evitar em lesão de lombar").click()
    await expect(page.getByRole("status")).toContainText("Agachamento livre")
    expect(corpo).toEqual({ riscos: ["lombar"] })
    expect(chave).toBeTruthy()
    await expect(page.getByLabel("Agachamento livre: evitar em lesão de lombar")).toBeChecked()
  })

  test("o painel de impacto mostra as fatias que ficam sem exercício para a lesão escolhida", async ({ page }) => {
    await abrir(page)
    await page.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "Bloqueados em joelho" }).click()
    const painel = page.getByTestId("painel-impacto")
    await expect(painel).toContainText("1 de 4 exercícios bloqueados")
    await expect(painel).toContainText("Fatias do playbook sem nenhum exercício liberado: nenhuma")
    await expect(painel).toContainText("Quadriceps composto")
  })

  test("erro da API desfaz a marcação e mostra a mensagem", async ({ page }) => {
    await abrir(page, async (route) => {
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "forbidden", message: "Admin only" }) })
    })
    await page.getByLabel("Agachamento livre: evitar em lesão de lombar").click()
    await expect(page.getByRole("alert")).toContainText("administradores")
    await expect(page.getByLabel("Agachamento livre: evitar em lesão de lombar")).not.toBeChecked()
  })

  test("bloquear o único exercício liberado de uma fatia pede confirmação", async ({ page }) => {
    let confirmou = false
    page.on("dialog", async (dialog) => {
      confirmou = true
      expect(dialog.message()).toContain("Quadriceps isolado")
      await dialog.dismiss()
    })
    await abrir(page)
    await page.getByLabel("Cadeira extensora: evitar em lesão de joelho").click()
    await expect.poll(() => confirmou).toBe(true)
    await expect(page.getByLabel("Cadeira extensora: evitar em lesão de joelho")).not.toBeChecked()
  })
})
