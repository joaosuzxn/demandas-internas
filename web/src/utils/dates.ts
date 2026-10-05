// Data e hora curtas em pt-BR (ex.: 03/10/2026, 09:30); null quando não há data.
export function formatDateTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Só a data curta em pt-BR (ex.: 03/10/2026); um traço quando não há data.
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

/** Primeiro dia aceito nos filtros por período, o mesmo piso da API (`DemandFilterRules`). */
export const EARLIEST_DAY = '2000-01-01'

// `AAAA-MM-DD` que existe no calendário (31/02 não).
export function isDate(value: string): boolean {
  if (!DATE_FORMAT.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** Data válida e a partir do piso: digitar o ano no campo passa por 0002, 0020, 0202 (comparação como texto). */
export function isFilterDay(value: string): boolean {
  return isDate(value) && value >= EARLIEST_DAY
}
