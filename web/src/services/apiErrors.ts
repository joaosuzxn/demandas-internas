import { isAxiosError } from 'axios'

export type ApiError = {
  fieldErrors: Record<string, string>
  message: string | null
}

const SERVER_UNREACHABLE = 'Não foi possível falar com o servidor. Tente novamente.'
const UNKNOWN = 'Algo deu errado. Tente novamente.'

type ErrorBody = { message?: unknown; errors?: unknown }

// Transforma um erro do Axios no que a tela mostra. `fields` são os campos que a tela exibe:
// erro 422 de qualquer outro campo vira mensagem geral, para nunca sumir.
export function parseApiError(error: unknown, fields: readonly string[] = []): ApiError {
  if (!isAxiosError(error)) {
    return { fieldErrors: {}, message: UNKNOWN }
  }

  if (!error.response || error.response.status >= 500) {
    return { fieldErrors: {}, message: SERVER_UNREACHABLE }
  }

  const body = (error.response.data ?? {}) as ErrorBody

  if (error.response.status === 422) {
    const all = firstMessages(body.errors)
    const fieldErrors: Record<string, string> = {}
    let other: string | null = null

    for (const [field, message] of Object.entries(all)) {
      if (fields.includes(field)) {
        fieldErrors[field] = message
      } else {
        other ??= message
      }
    }

    if (Object.keys(all).length > 0) {
      return { fieldErrors, message: other }
    }
  }

  return { fieldErrors: {}, message: messageOf(body) ?? UNKNOWN }
}

function messageOf(body: ErrorBody): string | null {
  return typeof body.message === 'string' && body.message !== '' ? body.message : null
}

function firstMessages(errors: unknown): Record<string, string> {
  const result: Record<string, string> = {}

  if (typeof errors !== 'object' || errors === null) {
    return result
  }

  for (const [field, messages] of Object.entries(errors)) {
    const first: unknown = Array.isArray(messages) ? messages[0] : messages
    if (typeof first === 'string') {
      result[field] = first
    }
  }

  return result
}
