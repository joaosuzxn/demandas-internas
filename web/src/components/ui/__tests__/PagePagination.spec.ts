import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PagePagination from '../PagePagination.vue'

function mountPagination(props: { page: number; lastPage: number; loading?: boolean }) {
  return mount(PagePagination, { props: { label: 'dos usuários', ...props } })
}

function button(wrapper: ReturnType<typeof mountPagination>, text: string) {
  return wrapper.findAll('button').find((candidate) => candidate.text() === text)!
}

describe('PagePagination', () => {
  it('não aparece quando há uma página só', () => {
    expect(mountPagination({ page: 1, lastPage: 1 }).find('nav').exists()).toBe(false)
  })

  it('mostra a página atual e emite as vizinhas', async () => {
    const wrapper = mountPagination({ page: 2, lastPage: 3 })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Paginação dos usuários')
    expect(wrapper.text()).toContain('Página 2 de 3')

    await button(wrapper, 'Anterior').trigger('click')
    await button(wrapper, 'Próxima').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[1], [3]])
  })

  it('trava os botões nas pontas e durante o carregamento', () => {
    const first = mountPagination({ page: 1, lastPage: 3 })
    expect(button(first, 'Anterior').attributes('disabled')).toBeDefined()
    expect(button(first, 'Próxima').attributes('disabled')).toBeUndefined()

    const last = mountPagination({ page: 3, lastPage: 3 })
    expect(button(last, 'Próxima').attributes('disabled')).toBeDefined()

    const loading = mountPagination({ page: 2, lastPage: 3, loading: true })
    expect(button(loading, 'Anterior').attributes('disabled')).toBeDefined()
    expect(button(loading, 'Próxima').attributes('disabled')).toBeDefined()
  })
})
