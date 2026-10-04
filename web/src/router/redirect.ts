import type { RouteLocationRaw } from 'vue-router'

// Só caminho interno: começa com uma barra só e não tem barra invertida (o navegador a lê como barra).
export function safeRedirect(value: unknown): string {
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
  ) {
    return value
  }

  return '/'
}

// Destinos padrão depois do login: a home e o dashboard, para onde ela redireciona antes da guarda (item 0030).
const DEFAULT_DESTINATIONS = ['/', '/dashboard']

// O login, guardando para onde a pessoa queria ir (o destino padrão não precisa ir na URL).
export function loginLocation(fullPath: string): RouteLocationRaw {
  return { name: 'login', query: DEFAULT_DESTINATIONS.includes(fullPath) ? {} : { redirect: fullPath } }
}
