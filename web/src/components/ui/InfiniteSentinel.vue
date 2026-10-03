<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

const emit = defineEmits<{
  /** O fim da lista apareceu na área de rolagem: hora de buscar mais. */
  visible: []
}>()

/** Antecipa o pedido: a página seguinte começa a chegar antes de a rolagem bater no fundo. */
const ROOT_MARGIN = '0px 0px 160px 0px'

const sentinel = useTemplateRef<HTMLLIElement>('sentinel')
let observer: IntersectionObserver | undefined

// A área observada é a lista em volta (a coluna que rola), e não a página.
onMounted(() => {
  const element = sentinel.value
  if (!element) return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) emit('visible')
    },
    { root: element.parentElement, rootMargin: ROOT_MARGIN },
  )
  observer.observe(element)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <!-- O último item da lista, sem conteúdo: só marca o fim para o observador. -->
  <li ref="sentinel" data-sentinel aria-hidden="true" class="h-px shrink-0"></li>
</template>
