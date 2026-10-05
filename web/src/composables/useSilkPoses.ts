import { onScopeDispose, ref, type Ref } from 'vue'

import { silkPoses, type SilkRibbon } from '@/utils/silk'

/** Uma fita do fundo, identificada para o `id` do gradiente e para casar com as poses. */
export interface SilkScene extends SilkRibbon {
  key: string
}

/**
 * Quantas poses por ciclo.
 *
 * Doze é onde a conta fechou: com oito, a interpolação do navegador entre uma pose e a
 * seguinte corta as cristas em até 13,9px; com doze cai para 6,3px, num desenho de ~190px de
 * amplitude — deformação do conjunto, não de uma linha contra a vizinha, então o espaçamento
 * não sofre. Dezesseis melhoraria para 3,6px e custaria um terço a mais de memória.
 */
export const SILK_POSES = 12

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Roda a tarefa quando o navegador estiver à toa; sem `requestIdleCallback`, no próximo tique. */
function whenIdle(task: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(task)

    return () => cancelIdleCallback(handle)
  }

  const handle = setTimeout(task, 0)

  return () => clearTimeout(handle)
}

/**
 * As poses da ondulação do fundo, prontas para o `values` de um `<animate>` do SVG: uma
 * string por linha da fita, com as poses separadas por `;`.
 *
 * A animação é **pré-compilada**: a geometria é calculada uma vez e o navegador só interpola
 * entre as poses, sem JS por quadro. Duas travas em volta disso:
 *
 * - `prefers-reduced-motion` não gera pose nenhuma, e sem `values` o `<animate>` nem existe
 *   — a fita fica no desenho parado;
 * - gerar as poses custa ~20ms, o bastante para atrasar a primeira pintura. Por isso sai do
 *   caminho do primeiro quadro: a tela abre com o fundo parado e ele começa a ondular um
 *   instante depois, o que ninguém percebe num fundo.
 */
export function useSilkPoses(ribbons: SilkScene[]): Ref<Record<string, string[]>> {
  const poses = ref<Record<string, string[]>>({})

  if (prefersReducedMotion()) return poses

  const cancel = whenIdle(() => {
    poses.value = Object.fromEntries(
      ribbons
        .filter((ribbon) => ribbon.cycle)
        .map((ribbon) => [ribbon.key, silkPoses(ribbon, SILK_POSES).map((line) => line.join(';'))]),
    )
  })

  onScopeDispose(cancel)

  return poses
}
