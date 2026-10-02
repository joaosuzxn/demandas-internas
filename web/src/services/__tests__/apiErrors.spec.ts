import { describe, it, expect } from 'vitest'
import { parseApiError } from '../apiErrors'
import { httpError, networkError } from './fixtures'

describe('parseApiError', () => {
  it('devolve a primeira mensagem de cada campo conhecido no 422', () => {
    const error = httpError(422, {
      message: 'Credenciais inválidas.',
      errors: { login: ['Credenciais inválidas.', 'Outra.'], password: ['Informe a senha.'] },
    })

    expect(parseApiError(error, ['login', 'password'])).toEqual({
      fieldErrors: { login: 'Credenciais inválidas.', password: 'Informe a senha.' },
      message: null,
    })
  })

  it('leva para a mensagem geral o erro de campo desconhecido', () => {
    const error = httpError(422, {
      message: 'O campo lembrar é inválido.',
      errors: { remember: ['O campo lembrar é inválido.'] },
    })

    expect(parseApiError(error, ['login', 'password'])).toEqual({
      fieldErrors: {},
      message: 'O campo lembrar é inválido.',
    })
  })

  it('mostra o campo conhecido e também a mensagem do desconhecido', () => {
    const error = httpError(422, {
      message: 'x',
      errors: { login: ['Credenciais inválidas.'], remember: ['Inválido.'] },
    })

    expect(parseApiError(error, ['login'])).toEqual({
      fieldErrors: { login: 'Credenciais inválidas.' },
      message: 'Inválido.',
    })
  })

  it('usa a mensagem da API no 429', () => {
    const error = httpError(429, {
      message: 'Muitas tentativas de login. Tente novamente em 42 segundos.',
    })

    expect(parseApiError(error)).toEqual({
      fieldErrors: {},
      message: 'Muitas tentativas de login. Tente novamente em 42 segundos.',
    })
  })

  it('usa a mensagem do 422 quando não vem errors', () => {
    expect(parseApiError(httpError(422, { message: 'Dados inválidos.' }), ['login'])).toEqual({
      fieldErrors: {},
      message: 'Dados inválidos.',
    })
  })

  it('avisa que não falou com o servidor quando não há resposta', () => {
    expect(parseApiError(networkError())).toEqual({
      fieldErrors: {},
      message: 'Não foi possível falar com o servidor. Tente novamente.',
    })
  })

  it('trata 5xx como servidor fora, mesmo com corpo em HTML ou mensagem em inglês', () => {
    const expected = {
      fieldErrors: {},
      message: 'Não foi possível falar com o servidor. Tente novamente.',
    }

    expect(parseApiError(httpError(502, '<html>Bad Gateway</html>'))).toEqual(expected)
    expect(parseApiError(httpError(500, { message: 'Server Error' }))).toEqual(expected)
  })

  it('usa a mensagem genérica quando a resposta não traz mensagem', () => {
    expect(parseApiError(httpError(418, {}))).toEqual({
      fieldErrors: {},
      message: 'Algo deu errado. Tente novamente.',
    })
  })

  it('usa a mensagem genérica para erro que não é do Axios', () => {
    expect(parseApiError(new Error('boom'))).toEqual({
      fieldErrors: {},
      message: 'Algo deu errado. Tente novamente.',
    })
  })
})
