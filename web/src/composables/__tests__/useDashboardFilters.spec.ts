import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { useDashboardFilters } from '../useDashboardFilters'

let filters!: ReturnType<typeof useDashboardFilters>

const Host = defineComponent({
  setup() {
    filters = useDashboardFilters()
    return () => null
  },
})

const App = defineComponent({ render: () => h(RouterView) })

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/dashboard', name: 'dashboard', component: Host }],
  })
  await router.push(path)
  mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return router
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useDashboardFilters', () => {
  it('abre em Tudo, sem datas e sem categoria', async () => {
    await mountAt('/dashboard')

    expect(filters.range.value).toBe('all')
    expect(filters.filters.value).toEqual({})
    expect(filters.periodLabel.value).toBe('Desde o início')
  })

  it('lê a URL e traduz o intervalo pronto em datas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 4, 12))
    await mountAt('/dashboard?range=week&category=hr')

    expect(filters.category.value).toBe('hr')
    expect(filters.filters.value).toEqual({
      category: 'hr',
      created_from: '2026-09-28',
      created_to: '2026-10-04',
    })
    expect(filters.periodLabel.value).toBe('28/09/2026 – 04/10/2026')
  })

  it('URL adulterada cai no padrão', async () => {
    await mountAt('/dashboard?range=xyz&category=abc&created_from=2026-02-31')

    expect(filters.range.value).toBe('all')
    expect(filters.category.value).toBe('')
    expect(filters.filters.value).toEqual({})
  })

  it('escreve a troca de filtro na URL', async () => {
    const router = await mountAt('/dashboard')

    filters.range.value = 'month'
    filters.category.value = 'it'
    await nextTick()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ range: 'month', category: 'it' })
  })

  it('personalizado incompleto não gera filtros e tem erro', async () => {
    await mountAt('/dashboard?range=custom&created_from=2026-10-01')

    expect(filters.filters.value).toBeNull()
    expect(filters.customError.value).toBe('Informe as duas datas do período.')
  })

  it('voltar no navegador devolve os filtros anteriores', async () => {
    const router = await mountAt('/dashboard?range=month')
    await router.push('/dashboard?range=year')
    await flushPromises()
    expect(filters.range.value).toBe('year')

    router.back()
    await new Promise((resolve) => setTimeout(resolve))
    await flushPromises()
    expect(filters.range.value).toBe('month')
  })
  // O campo de data muda a cada dígito do ano (0002, 0020, 0202, 2026): só a data depois da pausa vale.
  it('espera a pausa de digitação antes de aplicar as datas do personalizado', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(2026, 9, 4, 12))
    const router = await mountAt('/dashboard?range=custom&created_to=2026-10-04')

    filters.customStart.value = '0002-10-01'
    await nextTick()
    filters.customStart.value = '0202-10-01'
    await nextTick()
    filters.customStart.value = '2026-10-01'
    await nextTick()
    expect(filters.filters.value).toBeNull()

    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(filters.filters.value).toEqual({ created_from: '2026-10-01', created_to: '2026-10-04' })
    expect(router.currentRoute.value.query).toEqual({
      range: 'custom',
      created_from: '2026-10-01',
      created_to: '2026-10-04',
    })
  })
})
