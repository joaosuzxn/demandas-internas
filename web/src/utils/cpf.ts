// Máscara e formatação do CPF, trazidas do Órbita (`utils/cpf.ts`). Quem valida é a API (`App\Rules\Cpf`).

/** Só os dígitos do CPF: a máscara digitada é conveniência de tela. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** CPF formatado para leitura: `000.000.000-00`. Entrada incompleta sai como veio. */
export function formatCpf(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length !== 11) return value

  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/** Máscara progressiva (`xxx.xxx.xxx-xx`), aplicada enquanto se digita. */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)

  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}
