/** Taxa em % (0 quando não há base). */
export function ratePercent(numerator: number, denominator: number) {
  if (!denominator) return 0
  return (numerator / denominator) * 100
}

// Aproximação de Abramowitz-Stegun para a CDF normal padrão.
function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

export interface TwoProportionResult {
  diffPoints: number
  pValue: number | null
}

/**
 * Teste z de duas proporções (bicaudal). `diffPoints` = taxa B - taxa A em pontos percentuais.
 * `pValue` fica null quando alguma amostra é vazia ou as proporções são degeneradas.
 */
export function twoProportionTest(
  successesA: number,
  totalA: number,
  successesB: number,
  totalB: number
): TwoProportionResult {
  const diffPoints = ratePercent(successesB, totalB) - ratePercent(successesA, totalA)
  if (!totalA || !totalB) return { diffPoints, pValue: null }
  const pooled = (successesA + successesB) / (totalA + totalB)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / totalA + 1 / totalB))
  if (!se) return { diffPoints, pValue: null }
  const z = (successesB / totalB - successesA / totalA) / se
  return { diffPoints, pValue: 2 * (1 - normalCdf(Math.abs(z))) }
}
