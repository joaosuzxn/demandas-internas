import { nextTick, onBeforeUnmount, ref, useTemplateRef, watch, type Ref } from 'vue'

/** Onde a pílula da aba aberta está, em pixels medidos do próprio botão. */
interface TabPill {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Barra de abas do Órbita (item 0030): o item escolhido e a pílula que segue o botão selecionado. Aqui serve ao
 * seletor de intervalo do dashboard. A view nomeia o contêiner com `ref="nav"`.
 */
export function useTabBar<T extends string>(initial: T) {
  const active = ref(initial) as Ref<T>

  const nav = useTemplateRef<HTMLElement>('nav')
  const pill = ref<TabPill>({ left: 0, top: 0, width: 0, height: 0 })

  /**
   * A pílula só aparece depois da primeira medida: sem isso ela entraria na tela
   * escorregando do canto superior esquerdo toda vez que a tela abrisse.
   */
  const settled = ref(false)

  /**
   * A posição é medida do próprio botão em vez de calculada — largura de texto ninguém
   * adivinha no CSS. `offsetTop` junto com `offsetLeft` porque a barra quebra linha no
   * celular: a pílula precisa descer junto, não só andar para o lado.
   */
  function measure(): void {
    // Os dois estados possíveis da barra: aba (`aria-selected`) e botão de filtro que
    // liga/desliga (`aria-pressed`, como o seletor de intervalo do painel). A pílula é a
    // mesma; o que muda é a semântica do controle.
    const current = nav.value?.querySelector<HTMLElement>(
      '[aria-selected="true"],[aria-pressed="true"]',
    )
    if (!current) return

    pill.value = {
      left: current.offsetLeft,
      top: current.offsetTop,
      width: current.offsetWidth,
      height: current.offsetHeight,
    }
  }

  // jsdom não implementa `ResizeObserver`; sem ele a pílula só perde as remedições de layout.
  const observer =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure())

  /**
   * Mede quando a barra aparece e a cada troca de aba. `post` para o DOM já estar com o
   * `aria-selected` novo.
   */
  watch([nav, active], measure, { flush: 'post' })

  watch(
    nav,
    (element) => {
      observer?.disconnect()
      if (!element) return

      // A fonte terminando de carregar muda a largura do rótulo, e a barra quebra linha
      // conforme o tamanho da janela: nos dois casos a medida anterior fica velha.
      observer?.observe(element)
      for (const button of element.querySelectorAll('button')) observer?.observe(button)

      void nextTick(() => {
        measure()
        settled.value = true
      })
    },
    { flush: 'post', immediate: true },
  )

  onBeforeUnmount(() => observer?.disconnect())

  function select(key: T): void {
    active.value = key
  }

  return { active, pill, settled, select }
}
