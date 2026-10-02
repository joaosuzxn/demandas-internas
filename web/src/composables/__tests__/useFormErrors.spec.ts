import { describe, it, expect } from 'vitest'
import { REQUIRED_MESSAGE, useFormErrors } from '../useFormErrors'

describe('useFormErrors', () => {
  it('começa sem erros', () => {
    const errors = useFormErrors()

    expect(errors.fieldErrors.value).toEqual({})
    expect(errors.generalError.value).toBeNull()
    expect(errors.shake.value).toBe(0)
  })

  it('aceita o envio quando todos os campos estão preenchidos', () => {
    const errors = useFormErrors()

    expect(errors.requireFilled({ login: 'maria', password: ' ' })).toBe(true)
    expect(errors.fieldErrors.value).toEqual({})
    expect(errors.shake.value).toBe(0)
  })

  it('marca os campos vazios e pede a chacoalhada', () => {
    const errors = useFormErrors()

    expect(errors.requireFilled({ login: '', password: 'x', confirmation: '' })).toBe(false)
    expect(errors.fieldErrors.value).toEqual({
      login: REQUIRED_MESSAGE,
      confirmation: REQUIRED_MESSAGE,
    })
    expect(errors.shake.value).toBe(1)
  })

  it('pede uma chacoalhada nova a cada falha com erro de campo', () => {
    const errors = useFormErrors()

    errors.fail({ login: 'Usuário ou senha incorretos.' })
    errors.fail({ login: 'Usuário ou senha incorretos.' })

    expect(errors.shake.value).toBe(2)
  })

  it('não pede chacoalhada quando só há mensagem geral', () => {
    const errors = useFormErrors()

    errors.fail({}, 'Muitas tentativas.')

    expect(errors.generalError.value).toBe('Muitas tentativas.')
    expect(errors.fieldErrors.value).toEqual({})
    expect(errors.shake.value).toBe(0)
  })

  it('tira só os erros dos campos informados', () => {
    const errors = useFormErrors()
    errors.fail({ login: 'a', password: 'b', credentials: 'c' }, 'geral')

    errors.clear('password', 'credentials')

    expect(errors.fieldErrors.value).toEqual({ login: 'a' })
    expect(errors.generalError.value).toBe('geral')
  })

  it('não troca o objeto de erros quando não há o que tirar', () => {
    const errors = useFormErrors()
    errors.fail({ login: 'a' })
    const before = errors.fieldErrors.value

    errors.clear('password')

    expect(errors.fieldErrors.value).toBe(before)
  })

  it('reset apaga os erros de campo e a mensagem geral', () => {
    const errors = useFormErrors()
    errors.fail({ login: 'a' }, 'geral')

    errors.reset()

    expect(errors.fieldErrors.value).toEqual({})
    expect(errors.generalError.value).toBeNull()
  })
})
