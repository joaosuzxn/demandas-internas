import { computed, ref, watchEffect } from 'vue'
import { defineStore } from 'pinia'

// Tema da interface (item 0032), no molde da store `ui` do Órbita. O `dark:` do Tailwind responde à classe `dark`
// no `<html>`, que só fica ligada enquanto uma tela com sidebar está aberta: login e troca de senha são sempre claros.
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'demandas.theme'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** O que o sistema operacional pede, quando o navegador sabe responder. */
function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// A escolha de quem usa vence a do sistema; sem escolha, o sistema decide.
function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch (error) {
    console.error('[ui] não foi possível ler o tema salvo', error)
    return null
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch (error) {
    // Sem storage o tema ainda vale nesta aba; só não sobrevive ao recarregar.
    console.error('[ui] não foi possível salvar o tema', error)
  }
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>(readStoredTheme() ?? systemTheme())
  /** Uma tela com sidebar está aberta (o `DefaultLayout` avisa ao montar e ao sair). */
  const themedScreen = ref(false)

  const isDark = computed(() => theme.value === 'dark')

  function setTheme(next: Theme): void {
    theme.value = next
    storeTheme(next)
  }

  function toggleTheme(): void {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function enterThemedScreen(): void {
    themedScreen.value = true
  }

  function leaveThemedScreen(): void {
    themedScreen.value = false
  }

  // `sync`: o `<html>` muda na hora, sem esperar o próximo ciclo de renderização.
  watchEffect(
    () => {
      document.documentElement.classList.toggle('dark', isDark.value && themedScreen.value)
    },
    { flush: 'sync' },
  )

  return { theme, isDark, setTheme, toggleTheme, enterThemedScreen, leaveThemedScreen }
})
