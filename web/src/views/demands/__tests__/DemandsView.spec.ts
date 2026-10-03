import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import DemandsView from '../DemandsView.vue'
import * as demandsService from '@/services/demands'
import type { Demand, DemandPage } from '@/services/demands'
import { installIntersectionObserver } from '@/components/ui/__tests__/intersectionObserver'
import { demandsBoardRoute } from '@/composables/demandsBoardQuery'

vi.mock('@/services/demands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/demands')>()),
  listDemands: vi.fn<(params?: demandsService.ListDemandsParams) => Promise<DemandPage>>(),
  searchDemands: vi.fn<(params: demandsService.SearchDemandsParams) => Promise<DemandPage>>(),
}))

type FetchParams = demandsService.SearchDemandsParams
const list = vi.mocked(demandsService.listDemands)
const search = vi.mocked(demandsService.searchDemands)

// O quadro consulta a listagem sem filtro e a busca com filtro: as duas respondem pela mesma fábrica.
function fakeApi(impl: (params: FetchParams) => Promise<DemandPage>) {
  list.mockImplementation((params = {}) => impl(params))
  search.mockImplementation((params) => impl(params))
}

function clearApi() {
  list.mockClear()
  search.mockClear()
}

// Consultas feitas, somando as duas rotas.
function fetchCount() {
  return list.mock.calls.length + search.mock.calls.length
}

function makeDemand(overrides: Partial<Demand> = {}): Demand {
  return {
    id: 1,
    title: 'Trocar impressora',
    description: 'A do setor 2 não imprime.',
    category: 'it',
    status: 'pending',
    requester: { id: 1, name: 'Maria Souza' },
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-10-01T12:00:00+00:00',
    ...overrides,
  }
}

function page(data: Demand[], total = data.length, currentPage = 1, lastPage = 1): DemandPage {
  return { data, meta: { total, current_page: currentPage, last_page: lastPage } }
}

// Demandas pendentes a partir de um id. As páginas aqui são do mock (20): a SPA não supõe tamanho,
// só segue current_page e last_page (a API pagina de 10 em 10).
function pendingRange(from: number, count = 20): Demand[] {
  return Array.from({ length: count }, (_, index) =>
    makeDemand({ id: from + index, title: `Pendente ${from + index}` }),
  )
}

// Pendentes em 3 páginas (20 + 20 + 5); as outras colunas, vazias.
function paginatedPending(params: FetchParams = {}): DemandPage {
  if (params.status !== 'pending') return page([])
  const current = params.page ?? 1
  if (current === 1) return page(pendingRange(1), 45, 1, 3)
  if (current === 2) return page(pendingRange(21), 45, 2, 3)
  return page(pendingRange(41, 5), 45, 3, 3)
}

const Stub = defineComponent({ render: () => null })

// Os cartões são links para a tela da demanda, e os filtros moram na query de `/demandas`.
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/demandas', name: 'demands', component: Stub },
      { path: '/demandas/nova', name: 'demand-new', component: Stub },
      { path: '/demandas/:id', name: 'demand', component: Stub },
    ],
  })
}

let router: ReturnType<typeof makeRouter>

async function mountView(path = '/demandas') {
  router = makeRouter()
  await router.push(path)
  return mount(DemandsView, { global: { plugins: [router] } })
}

describe('DemandsView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    list.mockReset()
    search.mockReset()
    fakeApi(async (params) => {
      if (params.status === 'finished')
        return page([makeDemand({ id: 2, title: 'Contrato de limpeza', status: 'finished' })])
      if (params.status === 'in_progress')
        return page([makeDemand({ id: 3, title: 'Pintar sala', status: 'in_progress' })])
      return page([makeDemand({ title: 'Trocar impressora' })])
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('carrega as três situações ao abrir e mostra cada uma na sua coluna', async () => {
    const wrapper = await mountView()
    await flushPromises()

    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'pending' })
    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'finished' })
    expect(wrapper.get('[data-column="pending"]').text()).toContain('Trocar impressora')
    expect(wrapper.get('[data-column="in_progress"]').text()).toContain('Pintar sala')
    expect(wrapper.get('[data-column="finished"]').text()).toContain('Contrato de limpeza')
  })

  it('refaz a busca pelo título, sem espaços nas pontas, depois de uma pausa na digitação', async () => {
    const wrapper = await mountView()
    await flushPromises()
    clearApi()

    await wrapper.get('input[type="search"]').setValue('  impressora ')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(demandsService.searchDemands).toHaveBeenCalledWith({
      status: 'pending',
      search: 'impressora',
    })
    expect(demandsService.searchDemands).toHaveBeenCalledWith({
      status: 'in_progress',
      search: 'impressora',
    })
    expect(demandsService.searchDemands).toHaveBeenCalledWith({
      status: 'finished',
      search: 'impressora',
    })
  })

  describe('filtros', () => {
    // A lista do select vai para o body pelo Teleport; com o stub ela fica no wrapper.
    async function mountWithSelect(path = '/demandas') {
      router = makeRouter()
      await router.push(path)
      return mount(DemandsView, {
        global: { plugins: [router], stubs: { teleport: true } },
        attachTo: document.body,
      })
    }

    async function chooseCategory(wrapper: Awaited<ReturnType<typeof mountWithSelect>>, label: string) {
      await wrapper.get('[role="combobox"]').trigger('click')
      const option = wrapper.findAll('[role="option"]').find((item) => item.text() === label)
      await option!.trigger('click')
    }

    function dateInput(wrapper: Awaited<ReturnType<typeof mountWithSelect>>, label: string) {
      const id = wrapper.findAll('label').find((item) => item.text() === label)!.attributes('for')
      return wrapper.get(`#${id}`)
    }

    function clearButton(wrapper: Awaited<ReturnType<typeof mountWithSelect>>) {
      return wrapper.findAll('button').find((button) => button.text() === 'Limpar filtros')
    }

    function filtersButton(wrapper: Awaited<ReturnType<typeof mountWithSelect>>) {
      return wrapper.get('button[aria-controls]')
    }

    it('Categoria e período começam recolhidos e abrem pelo botão Filtros', async () => {
      const wrapper = await mountWithSelect()
      await flushPromises()

      const button = filtersButton(wrapper)
      const panel = wrapper.get(`#${button.attributes('aria-controls')}`)
      expect(button.attributes('aria-expanded')).toBe('false')
      expect(panel.isVisible()).toBe(false)

      await button.trigger('click')
      expect(button.attributes('aria-expanded')).toBe('true')
      expect(panel.isVisible()).toBe(true)
      expect(panel.text()).toContain('Categoria')

      await button.trigger('click')
      expect(button.attributes('aria-expanded')).toBe('false')
      wrapper.unmount()
    })

    // A busca fica à vista; o botão conta só o que o painel esconde.
    it('o botão diz quantos filtros do painel estão em vigor', async () => {
      const wrapper = await mountWithSelect()
      await flushPromises()
      await filtersButton(wrapper).trigger('click')
      await wrapper.get('input[type="search"]').setValue('impressora')
      expect(filtersButton(wrapper).text()).toBe('Filtros')

      await chooseCategory(wrapper, 'RH')
      await dateInput(wrapper, 'De').setValue('2026-10-01')

      expect(filtersButton(wrapper).text()).toBe('Filtros · 2')
      wrapper.unmount()
    })

    it('a categoria recarrega as três colunas na hora, sem a pausa', async () => {
      const wrapper = await mountWithSelect()
      await flushPromises()
      clearApi()

      await chooseCategory(wrapper, 'RH')
      await flushPromises()

      for (const status of ['pending', 'in_progress', 'finished'] as const) {
        expect(demandsService.searchDemands).toHaveBeenCalledWith({ status, category: 'hr' })
      }
      wrapper.unmount()
    })

    it('De e Até vão para a API, e a rolagem segue com todos os filtros', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))
      const wrapper = await mountWithSelect()
      await flushPromises()

      await chooseCategory(wrapper, 'TI')
      await dateInput(wrapper, 'De').setValue('2026-10-01')
      await dateInput(wrapper, 'Até').setValue('2026-10-03')
      await wrapper.get('input[type="search"]').setValue('pendente')
      vi.advanceTimersByTime(300)
      await flushPromises()

      const filters = {
        category: 'it',
        created_from: '2026-10-01',
        created_to: '2026-10-03',
        search: 'pendente',
      }
      expect(demandsService.searchDemands).toHaveBeenLastCalledWith({ status: 'finished', ...filters })

      clearApi()
      io.reveal()
      await flushPromises()

      expect(demandsService.searchDemands).toHaveBeenCalledWith({
        status: 'pending',
        ...filters,
        page: 2,
      })
      wrapper.unmount()
    })

    // Digitando o ano no campo de data, cada dígito já é uma data válida (0002, 0020, 0202, 2026).
    it('as datas esperam a pausa, e só a data final da digitação consulta', async () => {
      const wrapper = await mountWithSelect()
      await flushPromises()
      clearApi()

      for (const year of ['0002', '0020', '0202', '2026']) {
        await dateInput(wrapper, 'De').setValue(`${year}-10-01`)
        vi.advanceTimersByTime(100)
      }
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(fetchCount()).toBe(3)
      expect(demandsService.searchDemands).toHaveBeenCalledWith({
        status: 'pending',
        created_from: '2026-10-01',
      })
      wrapper.unmount()
    })

    it('ano com mais de quatro dígitos avisa no campo e não consulta', async () => {
      const wrapper = await mountWithSelect()
      await flushPromises()
      clearApi()

      await dateInput(wrapper, 'De').setValue('20260-10-01')
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(fetchCount()).toBe(0)
      expect(dateInput(wrapper, 'De').attributes('aria-invalid')).toBe('true')
      expect(wrapper.text()).toContain('Informe uma data válida.')
      wrapper.unmount()
    })

    it('período invertido avisa no Até e não consulta', async () => {
      const wrapper = await mountWithSelect()
      await flushPromises()

      await dateInput(wrapper, 'De').setValue('2026-10-03')
      vi.advanceTimersByTime(300)
      await flushPromises()
      clearApi()

      await dateInput(wrapper, 'Até').setValue('2026-10-01')
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(fetchCount()).toBe(0)
      expect(dateInput(wrapper, 'Até').attributes('aria-invalid')).toBe('true')
      expect(wrapper.text()).toContain('Use uma data igual ou depois da do De.')
      wrapper.unmount()
    })

    it('"Limpar filtros" só aparece com filtro ativo e volta tudo ao início', async () => {
      const wrapper = await mountWithSelect()
      await flushPromises()
      expect(clearButton(wrapper)).toBeUndefined()

      await chooseCategory(wrapper, 'RH')
      await dateInput(wrapper, 'De').setValue('2026-10-01')
      await wrapper.get('input[type="search"]').setValue('impressora')
      vi.advanceTimersByTime(300)
      await flushPromises()
      clearApi()

      // Limpar consulta na hora, sem a pausa, e uma vez só.
      await clearButton(wrapper)!.trigger('click')
      await flushPromises()

      expect(fetchCount()).toBe(3)
      expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'pending' })
      expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('')
      expect((dateInput(wrapper, 'De').element as HTMLInputElement).value).toBe('')
      expect(clearButton(wrapper)).toBeUndefined()

      vi.advanceTimersByTime(300)
      await flushPromises()
      expect(fetchCount()).toBe(3)
      expect(router.currentRoute.value.fullPath).toBe('/demandas')
      wrapper.unmount()
    })
  })

  describe('rota da API', () => {
    it('sem filtro consulta a listagem; com filtro, a busca, e a rolagem segue a mesma rota', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))
      const wrapper = await mountView()
      await flushPromises()

      expect(list).toHaveBeenCalledTimes(3)
      expect(search).not.toHaveBeenCalled()

      clearApi()
      await wrapper.get('input[type="search"]').setValue('pendente')
      vi.advanceTimersByTime(300)
      await flushPromises()
      io.reveal()
      await flushPromises()

      expect(list).not.toHaveBeenCalled()
      expect(search).toHaveBeenCalledTimes(4)
      expect(search).toHaveBeenLastCalledWith({ status: 'pending', search: 'pendente', page: 2 })
    })
  })

  describe('filtros na URL', () => {
    function field(wrapper: Awaited<ReturnType<typeof mountView>>, label: string) {
      const id = wrapper.findAll('label').find((item) => item.text() === label)!.attributes('for')
      return wrapper.get(`#${id}`).element as HTMLInputElement
    }

    it('abre com os filtros da query: preenche os campos e consulta com eles', async () => {
      const wrapper = await mountView(
        '/demandas?search=monitor&category=hr&created_from=2026-10-01&created_to=2026-10-03',
      )
      await flushPromises()

      for (const status of ['pending', 'in_progress', 'finished'] as const) {
        expect(demandsService.searchDemands).toHaveBeenCalledWith({
          status,
          search: 'monitor',
          category: 'hr',
          created_from: '2026-10-01',
          created_to: '2026-10-03',
        })
      }
      expect(fetchCount()).toBe(3)
      expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('monitor')
      expect(field(wrapper, 'De').value).toBe('2026-10-01')
      expect(wrapper.get('[role="combobox"]').text()).toContain('RH')
      expect(wrapper.get('button[aria-controls]').text()).toBe('Filtros · 3')
    })

    it('ignora na query o que não é filtro válido', async () => {
      await mountView('/demandas?category=xyz&created_from=ontem&search=impressora')
      await flushPromises()
      vi.advanceTimersByTime(300)
      await flushPromises()

      // Uma consulta só: a URL com lixo não é regravada (o que não vale já foi ignorado).
      expect(fetchCount()).toBe(3)
      expect(demandsService.searchDemands).toHaveBeenCalledWith({
        status: 'pending',
        search: 'impressora',
      })
    })

    it('a busca tem o mesmo teto da API: texto maior não chega à URL', async () => {
      const wrapper = await mountView()

      expect(wrapper.get('input[type="search"]').attributes('maxlength')).toBe('100')
    })

    // A gravação da letra anterior chega depois da letra nova: o campo não pode voltar atrás.
    it('a URL atrasada não apaga o que se continua digitando', async () => {
      const wrapper = await mountView()
      await flushPromises()
      const search = wrapper.get('input[type="search"]')

      await search.setValue('mon')
      vi.advanceTimersByTime(300)
      await search.setValue('moni')
      await flushPromises()

      expect((search.element as HTMLInputElement).value).toBe('moni')

      vi.advanceTimersByTime(300)
      await flushPromises()
      expect(router.currentRoute.value.query).toEqual({ search: 'moni' })
    })

    it('mexer nos filtros grava a query, sem empilhar histórico', async () => {
      const wrapper = await mountView()
      await flushPromises()
      const replace = vi.spyOn(router, 'replace')
      const push = vi.spyOn(router, 'push')

      await wrapper.get('input[type="search"]').setValue('  monitor ')
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ search: 'monitor' })
      expect(replace).toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
      expect(demandsService.searchDemands).toHaveBeenLastCalledWith({
        status: 'finished',
        search: 'monitor',
      })
    })

    it('a query mudando por fora (voltar do navegador, link) atualiza campos e quadro', async () => {
      const wrapper = await mountView('/demandas?search=monitor')
      await flushPromises()
      clearApi()

      await router.push('/demandas?category=it')
      await flushPromises()
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(fetchCount()).toBe(3)
      expect(demandsService.searchDemands).toHaveBeenCalledWith({ status: 'pending', category: 'it' })
      expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('')
      expect(router.currentRoute.value.fullPath).toBe('/demandas?category=it')
    })

    it('link com lixo vindo por fora também consulta uma vez só', async () => {
      await mountView()
      await flushPromises()
      clearApi()

      await router.push('/demandas?category=xyz&search=%20monitor%20')
      await flushPromises()
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(fetchCount()).toBe(3)
      expect(demandsService.searchDemands).toHaveBeenCalledWith({ status: 'pending', search: 'monitor' })
    })

    it('lembra o último quadro para o voltar das telas da demanda', async () => {
      await mountView('/demandas?category=hr')
      await flushPromises()

      expect(demandsBoardRoute()).toEqual({ name: 'demands', query: { category: 'hr' } })
    })
  })

  it('mostra o erro quando a API não responde', async () => {
    vi.mocked(demandsService.listDemands).mockRejectedValue(new Error('rede'))

    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar')
  })

  it('leva à tela de criar demanda pela pílula do cabeçalho', async () => {
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.get('a[aria-label="Criar demanda"]').attributes('href')).toBe('/demandas/nova')
  })

  describe('rolagem infinita', () => {
    function pendingCards(wrapper: Awaited<ReturnType<typeof mountView>>) {
      return wrapper.get('[data-column="pending"]').findAll('[data-demand]')
    }

    it('ao chegar no fim da coluna, busca a página seguinte e acrescenta', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))

      const wrapper = await mountView()
      await flushPromises()
      expect(pendingCards(wrapper)).toHaveLength(20)

      io.reveal()
      await flushPromises()

      expect(demandsService.listDemands).toHaveBeenCalledWith({ status: 'pending', page: 2 })
      expect(pendingCards(wrapper)).toHaveLength(40)
      expect(pendingCards(wrapper)[20]!.text()).toContain('Pendente 21')
    })

    it('para na última página', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))

      const wrapper = await mountView()
      await flushPromises()
      for (let round = 0; round < 3; round++) {
        io.reveal()
        await flushPromises()
      }

      expect(pendingCards(wrapper)).toHaveLength(45)
      const pages = vi
        .mocked(demandsService.listDemands)
        .mock.calls.map(([params]) => params?.page)
        .filter((value) => value !== undefined)
      expect(pages).toEqual([2, 3])
    })

    it('não pede a mesma coluna duas vezes enquanto a página chega', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))
      const wrapper = await mountView()
      await flushPromises()

      let release: (value: DemandPage) => void = () => {}
      vi.mocked(demandsService.listDemands).mockImplementation(
        () => new Promise<DemandPage>((resolve) => (release = resolve)),
      )
      io.reveal()
      io.reveal()
      await flushPromises()

      expect(fetchCount()).toBe(4)
      expect(wrapper.get('[data-column="pending"]').text()).toContain('Carregando mais…')

      release(page(pendingRange(21), 45, 2, 3))
      await flushPromises()
      expect(pendingCards(wrapper)).toHaveLength(40)
    })

    it('ignora demanda que já está na coluna (as páginas andam quando alguém cria uma)', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => {
        if (params?.status !== 'pending') return page([])
        // A página 2 começa repetindo a última da página 1.
        return params.page === 2
          ? page(pendingRange(20, 20), 46, 2, 3)
          : page(pendingRange(1), 46, 1, 3)
      })

      const wrapper = await mountView()
      await flushPromises()
      io.reveal()
      await flushPromises()

      const ids = pendingCards(wrapper).map((card) => card.attributes('data-demand'))
      expect(ids).toHaveLength(39)
      expect(new Set(ids).size).toBe(39)
    })

    it('no erro, mantém o que já apareceu e tenta de novo pelo botão', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))
      const wrapper = await mountView()
      await flushPromises()

      vi.mocked(demandsService.listDemands).mockRejectedValueOnce(new Error('rede'))
      io.reveal()
      await flushPromises()

      const pending = wrapper.get('[data-column="pending"]')
      expect(pending.text()).toContain('Não foi possível carregar mais.')
      expect(pendingCards(wrapper)).toHaveLength(20)

      await pending
        .findAll('button')
        .find((button) => button.text() === 'Tentar de novo')!
        .trigger('click')
      await flushPromises()

      expect(pendingCards(wrapper)).toHaveLength(40)
      expect(wrapper.get('[data-column="pending"]').text()).not.toContain(
        'Não foi possível carregar mais.',
      )
    })

    it('a busca recomeça da primeira página, e a rolagem segue com o termo', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))
      const wrapper = await mountView()
      await flushPromises()
      io.reveal()
      await flushPromises()
      expect(pendingCards(wrapper)).toHaveLength(40)

      await wrapper.get('input[type="search"]').setValue('pendente')
      vi.advanceTimersByTime(300)
      await flushPromises()

      expect(pendingCards(wrapper)).toHaveLength(20)

      clearApi()
      io.reveal()
      await flushPromises()

      expect(demandsService.searchDemands).toHaveBeenCalledWith({
        status: 'pending',
        search: 'pendente',
        page: 2,
      })
    })

    it('página que chega depois de uma busca nova é descartada', async () => {
      const io = installIntersectionObserver()
      fakeApi(async (params) => paginatedPending(params))
      const wrapper = await mountView()
      await flushPromises()

      let release: (value: DemandPage) => void = () => {}
      vi.mocked(demandsService.listDemands).mockImplementationOnce(
        () => new Promise<DemandPage>((resolve) => (release = resolve)),
      )
      io.reveal()
      await flushPromises()

      await wrapper.get('input[type="search"]').setValue('pendente')
      vi.advanceTimersByTime(300)
      await flushPromises()

      release(page(pendingRange(21), 45, 2, 3))
      await flushPromises()

      expect(pendingCards(wrapper)).toHaveLength(20)
    })
  })
})
