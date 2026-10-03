import { vi } from 'vitest'

type Observed = {
  callback: IntersectionObserverCallback
  options: IntersectionObserverInit | undefined
  targets: Element[]
  disconnected: boolean
}

/**
 * Dublê do IntersectionObserver, que o jsdom não tem. `reveal()` faz os elementos observados
 * "aparecerem" na área de rolagem, como quando a pessoa rola até eles.
 */
export function installIntersectionObserver() {
  const observers: Observed[] = []

  class FakeIntersectionObserver {
    private readonly record: Observed

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.record = { callback, options, targets: [], disconnected: false }
      observers.push(this.record)
    }

    observe(target: Element) {
      this.record.targets.push(target)
    }

    unobserve(target: Element) {
      this.record.targets = this.record.targets.filter((candidate) => candidate !== target)
    }

    disconnect() {
      this.record.disconnected = true
      this.record.targets = []
    }

    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }

  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

  return {
    observers,
    /** Os observadores que ainda vigiam algum elemento. */
    active: () =>
      observers.filter((observer) => !observer.disconnected && observer.targets.length > 0),
    /** Faz todos os elementos vigiados aparecerem. */
    reveal() {
      for (const observer of observers) {
        if (observer.disconnected) continue
        const entries = observer.targets.map(
          (target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry,
        )
        if (entries.length > 0) observer.callback(entries, {} as IntersectionObserver)
      }
    },
  }
}
