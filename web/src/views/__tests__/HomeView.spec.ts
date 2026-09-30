import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import HomeView from '../HomeView.vue'
import { getHealth, type Health } from '@/services/health'

vi.mock('@/services/health', () => ({ getHealth: vi.fn<() => Promise<Health>>() }))

function erroHttp(status: number): AxiosError {
  const response = {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

async function montar() {
  const wrapper = mount(HomeView)
  await flushPromises()
  return wrapper
}

describe('HomeView', () => {
  beforeEach(() => {
    vi.mocked(getHealth).mockReset()
  })

  it('mostra o nome do sistema', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok', app: 'Demandas Internas', database: 'ok' })
    const wrapper = await montar()
    expect(wrapper.get('h1').text()).toBe('Demandas Internas')
  })

  it('mostra que está verificando enquanto a API não responde', () => {
    vi.mocked(getHealth).mockReturnValue(new Promise(() => {}))
    const wrapper = mount(HomeView)
    expect(wrapper.get('[data-testid="estado"]').text()).toBe('Verificando a API…')
  })

  it('mostra API e banco ok quando o health responde 200', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok', app: 'Demandas Internas', database: 'ok' })
    const wrapper = await montar()
    const estado = wrapper.get('[data-testid="estado"]').text()
    expect(estado).toContain('API ok')
    expect(estado).toContain('Banco ok')
  })

  it('mostra banco indisponível quando o health responde 503', async () => {
    vi.mocked(getHealth).mockRejectedValue(erroHttp(503))
    const wrapper = await montar()
    expect(wrapper.get('[role="alert"]').text()).toBe('Banco indisponível')
  })

  it('mostra que não fala com a API quando a rede falha', async () => {
    vi.mocked(getHealth).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    const wrapper = await montar()
    expect(wrapper.get('[role="alert"]').text()).toBe('Não foi possível falar com a API')
  })

  it('mostra que não fala com a API quando o nginx responde 502', async () => {
    vi.mocked(getHealth).mockRejectedValue(erroHttp(502))
    const wrapper = await montar()
    expect(wrapper.get('[role="alert"]').text()).toBe('Não foi possível falar com a API')
  })
})
