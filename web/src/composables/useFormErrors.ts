import { ref } from 'vue'

export const REQUIRED_MESSAGE = 'Preencha esse campo.'

// Erros de um formulário: por campo (mensagem sob o campo) e geral (uma linha acima do botão).
// `shake` muda a cada falha com erro de campo; o BaseInput usa isso para chacoalhar.
export function useFormErrors() {
  const fieldErrors = ref<Record<string, string>>({})
  const generalError = ref<string | null>(null)
  const shake = ref(0)

  function reset(): void {
    fieldErrors.value = {}
    generalError.value = null
  }

  function fail(errors: Record<string, string>, message: string | null = null): void {
    fieldErrors.value = errors
    generalError.value = message

    if (Object.keys(errors).length > 0) {
      shake.value++
    }
  }

  // Marca os campos vazios e devolve false se houver algum. A senha não é aparada: espaço conta.
  function requireFilled(values: Record<string, string>): boolean {
    const missing: Record<string, string> = {}

    for (const [field, value] of Object.entries(values)) {
      if (value === '') {
        missing[field] = REQUIRED_MESSAGE
      }
    }

    if (Object.keys(missing).length === 0) {
      return true
    }

    fail(missing)
    return false
  }

  // Chamado quando a pessoa volta a digitar: o erro daquele campo deixa de valer.
  function clear(...fields: string[]): void {
    if (!fields.some((field) => field in fieldErrors.value)) return

    const remaining = { ...fieldErrors.value }
    for (const field of fields) {
      delete remaining[field]
    }
    fieldErrors.value = remaining
  }

  return { fieldErrors, generalError, shake, reset, fail, requireFilled, clear }
}
