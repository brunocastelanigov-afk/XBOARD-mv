export function formatDate(value: string | null | undefined) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value))
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "-"
  const rounded = Math.round(seconds)
  const minutes = Math.floor(rounded / 60)
  const remainingSeconds = rounded % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0))
}

export function formatPercent(value: number | null | undefined) {
  return `${(Number(value ?? 0) * 100).toFixed(0)}%`
}

export function formatCurrency(cents: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents ?? 0) / 100)
}

// Problema 04: "hoje"/"ontem" precisam ser calculados no calendário de Brasília, não em UTC
// nem no fuso local do navegador -- senão o filtro de data diverge do que o gestor de
// tráfego vê no UTMify/Lastlink perto da meia-noite BRT.
const BRAZIL_TIME_ZONE = "America/Sao_Paulo"
const brazilDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: BRAZIL_TIME_ZONE })

export function toIsoDate(date: Date) {
  return brazilDateFormatter.format(date)
}

const TEST_VARIANT_PATTERN = /smoke|codex|root_variant_test/i

export function isTestVariant(variant: string | null | undefined) {
  return Boolean(variant && TEST_VARIANT_PATTERN.test(variant))
}

export function lastDaysRange(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return {
    dateFrom: toIsoDate(from),
    dateTo: toIsoDate(to),
  }
}
