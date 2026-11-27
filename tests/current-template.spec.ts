import { expect, test } from "@playwright/test"

import { findCurrentTemplate, programSignature, templateSignature } from "../src/lib/current-template"

const days = (ids: string[][]) =>
  ids.map((day, d) => ({ ordem: d + 1, exercises: day.map((exercise_id, i) => ({ ordem: i + 1, exercise_id })) }))

const template = (id: string, nome: string, ids: string[][]) => ({ id, nome, signature: templateSignature(days(ids)) })

const templates = [
  template("feminino", "Para Crescer e Secar", [["a", "b"], ["c"]]),
  template("masculino", "Para Crescer e Secar", [["a", "d"], ["c"]]),
  template("unico", "Protocolo B", [["e"]]),
]

const current = (ids: string[][]) =>
  programSignature(days(ids).map((d) => ({ ordem: d.ordem, exercicios: d.exercises })))

test("nome repetido: escolhe pelo exercício, não pela ordem da lista", () => {
  expect(findCurrentTemplate(templates, "Para Crescer e Secar", current([["a", "d"], ["c"]]))?.id).toBe("masculino")
})

test("a ordem das linhas recebidas não muda a assinatura", () => {
  const shuffled = programSignature([
    { ordem: 2, exercicios: [{ ordem: 1, exercise_id: "c" }] },
    { ordem: 1, exercicios: [{ ordem: 2, exercise_id: "d" }, { ordem: 1, exercise_id: "a" }] },
  ])
  expect(findCurrentTemplate(templates, "Para Crescer e Secar", shuffled)?.id).toBe("masculino")
})

test("nome repetido sem correspondência (treino editado ou não carregado): não afirma", () => {
  expect(findCurrentTemplate(templates, "Para Crescer e Secar", current([["a", "z"], ["c"]]))).toBeUndefined()
  expect(findCurrentTemplate(templates, "Para Crescer e Secar", null)).toBeUndefined()
})

test("modelos idênticos com o mesmo nome: não afirma", () => {
  const twins = [template("x", "N", [["a"]]), template("y", "N", [["a"]])]
  expect(findCurrentTemplate(twins, "N", current([["a"]]))).toBeUndefined()
})

test("nome único continua identificado mesmo com treino editado; nome desconhecido não", () => {
  expect(findCurrentTemplate(templates, "Protocolo B", current([["z"]]))?.id).toBe("unico")
  expect(findCurrentTemplate(templates, "Personalizado", current([["e"]]))).toBeUndefined()
})
