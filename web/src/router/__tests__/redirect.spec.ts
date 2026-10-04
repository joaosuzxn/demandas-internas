import { describe, it, expect } from 'vitest'
import { loginLocation, safeRedirect } from '../redirect'

describe('safeRedirect', () => {
  it('aceita caminho interno', () => {
    expect(safeRedirect('/reports?page=2')).toBe('/reports?page=2')
  })

  it.each([
    ['//evil.example'],
    ['https://evil.example'],
    ['/\\evil.example'],
    ['reports'],
    [''],
    [undefined],
    [null],
    [['/a', '/b']],
  ])('volta para a home com %j', (value) => {
    expect(safeRedirect(value)).toBe('/')
  })
})

describe('loginLocation', () => {
  it('leva o caminho pedido em redirect', () => {
    expect(loginLocation('/reports?page=2')).toEqual({
      name: 'login',
      query: { redirect: '/reports?page=2' },
    })
  })

  it('não leva redirect quando o caminho pedido é a home', () => {
    expect(loginLocation('/')).toEqual({ name: 'login', query: {} })
  })

  // A home redireciona para o dashboard (item 0030) antes da guarda: ele também é o destino padrão.
  it('não leva redirect quando o caminho pedido é o dashboard', () => {
    expect(loginLocation('/dashboard')).toEqual({ name: 'login', query: {} })
    expect(loginLocation('/dashboard?range=month')).toEqual({
      name: 'login',
      query: { redirect: '/dashboard?range=month' },
    })
  })
})
