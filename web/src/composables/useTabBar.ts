import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch, type Ref } from 'vue'

/** Onde a pílula da aba aberta está, em pixels medidos do próprio botão. */
export interface TabPill {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Barra de abas do Órbita (item 0030): o item escolhido, o sentido do deslize e a pílula que segue o botão
 * selecionado. Aqui serve ao seletor de intervalo do dashboard. A view só precisa nomear o contêiner com
 * `ref="nav"` (ou passar outro nome em `navRef`).
 */
export function useTabBar<T extends string>(keys: readonly T[], initial: T, navRef = 'nav') {
  const active = ref(initial) as Ref<T>

  /** Sentido da última troca: 1 é ir para a direita na barra, -1 é voltar. */
  const direction = ref(1)

  /**
   * Classes do deslize. Curto de propósito (6px): é uma pista de para onde a tela andou,
   * não uma virada de página.
   */
  const slide = computed(() =>
    direction.value === 1
      ? { from: 'translate-x-1.5', to: '-translate-x-1.5' }
      : { from: '-translate-x-1.5', to: 'translate-x-1.5' },
  )

  const nav = useTemplateRef<HTMLElement>(navRef)
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
   * Mede quando a barra aparece (ela pode só existir depois de o cargo chegar) e a cada
   * troca de aba. `post` para o DOM já estar com o `aria-selected` novo.
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

  /** Abre a aba e guarda de que lado ela veio, para o conteúdo deslizar no mesmo sentido. */
  function select(key: T): void {
    if (key === active.value) return

    const order = (candidate: T) => keys.indexOf(candidate)
    direction.value = order(key) > order(active.value) ? 1 : -1
    active.value = key
  }

  return { active, direction, slide, pill, settled, select, measure }
}
