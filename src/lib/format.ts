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
  return `${Number(value ?? 0).toFixed(0)}%`
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function lastDaysRange(days: number) {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - days)
  return {
    dateFrom: toIsoDate(from),
    dateTo: toIsoDate(to),
  }
}
