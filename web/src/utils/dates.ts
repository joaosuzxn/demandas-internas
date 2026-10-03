// Data e hora curtas em pt-BR (ex.: 03/10/2026, 09:30); null quando não há data.
export function formatDateTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
