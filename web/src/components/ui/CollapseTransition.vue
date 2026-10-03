<script setup lang="ts">
/**
 * Abre e recolhe um painel de forma suave: altura e opacidade juntas. Trazido do Órbita (item 0027).
 *
 * Altura `auto` não anima por CSS, então os ganchos medem a altura real do conteúdo,
 * animam até ela e, ao fim, soltam o valor — o painel aberto volta a crescer com o que
 * tiver dentro. Quem esconde é o `v-show` do filho: recolhido, o painel sai de cena de
 * verdade (fora do Tab e do leitor de tela), não só fica com altura zero.
 *
 * Quem pede menos movimento no sistema (`prefers-reduced-motion`) vê a troca seca.
 */

function measure(element: Element): HTMLElement {
  return element as HTMLElement
}

/** Força o navegador a aplicar a altura de partida antes da de chegada. */
function reflow(element: HTMLElement): void {
  void element.offsetHeight
}

function release(element: Element): void {
  const panel = measure(element)
  panel.style.height = ''
  panel.style.overflow = ''
}

function onEnter(element: Element): void {
  const panel = measure(element)
  panel.style.overflow = 'hidden'
  panel.style.height = '0px'
  reflow(panel)
  panel.style.height = `${panel.scrollHeight}px`
}

function onLeave(element: Element): void {
  const panel = measure(element)
  panel.style.overflow = 'hidden'
  panel.style.height = `${panel.scrollHeight}px`
  reflow(panel)
  panel.style.height = '0px'
}
</script>

<template>
  <Transition
    enter-active-class="transition-[height,opacity] duration-300 ease-out motion-reduce:transition-none"
    enter-from-class="opacity-0"
    leave-active-class="transition-[height,opacity] duration-200 ease-in motion-reduce:transition-none"
    leave-to-class="opacity-0"
    @enter="onEnter"
    @after-enter="release"
    @enter-cancelled="release"
    @leave="onLeave"
    @after-leave="release"
    @leave-cancelled="release"
  >
    <slot />
  </Transition>
</template>
