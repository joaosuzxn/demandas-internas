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

// O login, guardando para onde a pessoa queria ir (a home é o destino padrão e não precisa ir na URL).
export function loginLocation(fullPath: string): RouteLocationRaw {
  return { name: 'login', query: fullPath === '/' ? {} : { redirect: fullPath } }
}
