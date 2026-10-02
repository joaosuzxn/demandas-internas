<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import ChangePasswordForm from './ChangePasswordForm.vue'
import LoginForm from './LoginForm.vue'

const props = defineProps<{
  /** Conteúdo do card: troca sem recarregar a página. */
  step: 'login' | 'change-password'
}>()

const card = useTemplateRef<HTMLElement>('card')
let resizeAnimation: Animation | null = null

// Encolhe/expande o card entre o login e a troca de senha. Largura e altura `auto` não
// transicionam em CSS, então mede antes e depois da troca e anima (FLIP).
watch(
  () => props.step,
  async () => {
    const element = card.value
    if (
      !element ||
      typeof element.animate !== 'function' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    resizeAnimation?.cancel()
    const from = element.getBoundingClientRect()
    await nextTick()
    const to = element.getBoundingClientRect()

    // Trava o conteúdo na largura final enquanto o card anima: o card revela/recorta (tem
    // `overflow-hidden`) em vez de o texto requebrar a cada quadro da animação.
    const content = [...element.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.offsetWidth > 0,
    )
    content.forEach((child) => (child.style.width = `${child.offsetWidth}px`))
    const releaseContent = () => content.forEach((child) => child.style.removeProperty('width'))

    resizeAnimation = element.animate(
      [
        { width: `${from.width}px`, height: `${from.height}px` },
        { width: `${to.width}px`, height: `${to.height}px` },
      ],
      { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
    // `cancel()` rejeita o `finished`: a trava sai nos dois casos.
    resizeAnimation.finished.then(releaseContent, releaseContent)
  },
)
</script>

<template>
  <section
    ref="card"
    class="shadow-dusk-900/50 relative z-10 w-full max-w-md overflow-hidden rounded-4xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-2xl sm:p-10"
  >
    <ChangePasswordForm
      v-if="step === 'change-password'"
      class="animate-fade-in motion-reduce:animate-none"
    />
    <LoginForm v-else class="animate-fade-in motion-reduce:animate-none" />
  </section>
</template>
