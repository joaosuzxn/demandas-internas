import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorRetry from '../ErrorRetry.vue'

describe('ErrorRetry', () => {
  it('anuncia o erro e oferece tentar de novo', async () => {
    const wrapper = mount(ErrorRetry, { props: { message: 'Não foi possível carregar.' } })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('Não foi possível carregar.')

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').text()).toBe('Tentar de novo')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
