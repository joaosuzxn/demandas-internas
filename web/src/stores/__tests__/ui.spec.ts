import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { THEME_STORAGE_KEY, useUiStore } from '../ui'

function systemPrefersDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn<(query: string) => MediaQueryList>(() => ({ matches: dark }) as MediaQueryList),
  )
}

const html = () => document.documentElement

describe('store ui (tema)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    html().classList.remove('dark')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('na 1ª visita segue o sistema', () => {
    systemPrefersDark(true)
    expect(useUiStore().theme).toBe('dark')
  })

  it('sem matchMedia, começa claro', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(useUiStore().theme).toBe('light')
  })

  it('a escolha salva vence o sistema', () => {
    systemPrefersDark(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(useUiStore().theme).toBe('light')
  })

  it('alternar troca o tema e grava a escolha', () => {
    systemPrefersDark(false)
    const ui = useUiStore()

    ui.toggleTheme()
    expect(ui.theme).toBe('dark')
    expect(ui.isDark).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('o <html> só fica escuro com uma tela interna aberta', () => {
    systemPrefersDark(true)
    const ui = useUiStore()
    expect(html().classList.contains('dark')).toBe(false)

    ui.enterThemedScreen()
    expect(html().classList.contains('dark')).toBe(true)

    ui.toggleTheme()
    expect(html().classList.contains('dark')).toBe(false)
    ui.toggleTheme()

    ui.leaveThemedScreen()
    expect(html().classList.contains('dark')).toBe(false)
  })

  it('localStorage bloqueado não quebra: o tema vale na aba', () => {
    systemPrefersDark(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const ui = useUiStore()
    expect(ui.theme).toBe('light')
    ui.toggleTheme()
    expect(ui.theme).toBe('dark')
  })
})
