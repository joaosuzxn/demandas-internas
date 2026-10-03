import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

/** Quanto tempo o aviso fica à vista antes de se recolher sozinho. */
export const NOTICE_TIMEOUT_MS = 5000

/**
 * O aviso de quem chega de outra tela (ex.: "Demanda criada."), como no Órbita: vem no estado da
 * navegação, e não na URL, e vale uma vez — é apagado na hora, para o F5 e o voltar do navegador
 * não o repetirem. Chamar no `setup` da tela que recebe.
 */
export function useArrivalNotice() {
  const router = useRouter()
  const history = router.options.history
  const state = history.state

  const notice = ref<string | null>(typeof state.notice === 'string' ? state.notice : null)
  let timer: ReturnType<typeof setTimeout> | undefined

  if (notice.value) {
    history.replace(router.currentRoute.value.fullPath, { ...state, notice: null })
    timer = setTimeout(() => (notice.value = null), NOTICE_TIMEOUT_MS)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return notice
}
