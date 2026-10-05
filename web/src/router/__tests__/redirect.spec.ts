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

  // A home redireciona para as solicitações (item 0034) antes da guarda: elas também são o destino padrão.
  it('não leva redirect quando o caminho pedido é o quadro de solicitações', () => {
    expect(loginLocation('/solicitacoes')).toEqual({ name: 'login', query: {} })
    expect(loginLocation('/solicitacoes?status=pending')).toEqual({
      name: 'login',
      query: { redirect: '/solicitacoes?status=pending' },
    })
  })

  it('leva redirect quando o caminho pedido é o dashboard', () => {
    expect(loginLocation('/dashboard')).toEqual({ name: 'login', query: { redirect: '/dashboard' } })
  })
})
