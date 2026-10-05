import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardFilters from '../DashboardFilters.vue'

function mountFilters(props: Record<string, unknown> = {}) {
  return mount(DashboardFilters, {
    props: {
      range: 'all',
      category: '',
      customStart: '',
      customEnd: '',
      periodLabel: 'Desde o início',
      customError: null,
      ...props,
    },
    global: { stubs: { teleport: true } },
  })
}

function rangeButton(wrapper: ReturnType<typeof mountFilters>, label: string) {
  return wrapper.findAll('button[aria-pressed]').find((button) => button.text() === label)!
}

describe('DashboardFilters', () => {
  it('mostra os seis intervalos com Tudo pressionado e o período', () => {
    const wrapper = mountFilters()

    expect(wrapper.findAll('button[aria-pressed]').map((button) => button.text())).toEqual([
      'Tudo',
      '1 semana',
      '1 mês',
      '3 meses',
      '1 ano',
      'Personalizado',
    ])
    expect(rangeButton(wrapper, 'Tudo').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Desde o início')
  })

  it('clicar num intervalo atualiza o v-model', async () => {
    const wrapper = mountFilters()

    await rangeButton(wrapper, '1 mês').trigger('click')
    expect(wrapper.emitted('update:range')).toEqual([['month']])
  })

  it('De e Até só aparecem no personalizado', () => {
    expect(mountFilters().findAll('input[type="date"]')).toHaveLength(0)
    expect(mountFilters({ range: 'custom' }).findAll('input[type="date"]')).toHaveLength(2)
  })

  it('erro vai no campo que o causou, e só depois de começar a escolher', () => {
    const untouched = mountFilters({
      range: 'custom',
      customError: 'Informe as duas datas do período.',
    })
    expect(untouched.text()).not.toContain('Informe')

    const missingEnd = mountFilters({
      range: 'custom',
      customStart: '2026-10-01',
      customError: 'Informe as duas datas do período.',
    })
    expect(missingEnd.text()).toContain('Informe a data final.')

    const inverted = mountFilters({
      range: 'custom',
      customStart: '2026-10-03',
      customEnd: '2026-10-01',
      customError: 'A data final não pode ser anterior à inicial.',
    })
    expect(inverted.text()).toContain('A data final não pode ser anterior à inicial.')
  })
})
