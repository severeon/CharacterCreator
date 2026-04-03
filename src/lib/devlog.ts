/**
 * Dev-mode logging with high-resolution timestamps.
 *
 * All output is prefixed with [DEV:<channel>] and a ms timestamp relative to
 * page load so that an AI agent reading console output can reconstruct the
 * exact sequence and timing of renders, state changes, fetches, and DOM
 * mutations.
 *
 * Everything is no-op when import.meta.env.DEV is false.
 */

const ENABLED = import.meta.env.DEV
const t0 = ENABLED ? performance.now() : 0

type Channel =
  | 'render'
  | 'mount'
  | 'unmount'
  | 'effect'
  | 'state'
  | 'fetch'
  | 'dom'
  | 'nav'
  | 'perf'

function ts(): string {
  return `+${(performance.now() - t0).toFixed(1)}ms`
}

function log(channel: Channel, component: string, message: string, data?: unknown) {
  if (!ENABLED) return
  const prefix = `[DEV:${channel}] ${ts()} <${component}>`
  if (data !== undefined) {
    console.log(prefix, message, data)
  } else {
    console.log(prefix, message)
  }
}

// ── Render dedup (StrictMode fires every render twice) ──────────────────────

let lastRender = { component: '', time: 0, count: 0 }
let renderFlushTimer: ReturnType<typeof setTimeout> | null = null

function flushRender() {
  if (lastRender.count > 0) {
    const suffix = lastRender.count > 1 ? ` (×${lastRender.count} — StrictMode)` : ''
    log('render', lastRender.component, `render${suffix}`)
  }
  lastRender = { component: '', time: 0, count: 0 }
  renderFlushTimer = null
}

// ── Public API ──────────────────────────────────────────────────────────────

export function devRender(component: string, props?: Record<string, unknown>) {
  const now = performance.now()
  if (component === lastRender.component && now - lastRender.time < 50) {
    lastRender.count++
    lastRender.time = now
    return
  }
  // Flush previous if different component
  if (renderFlushTimer) { clearTimeout(renderFlushTimer); flushRender() }
  lastRender = { component, time: now, count: 1 }
  renderFlushTimer = setTimeout(flushRender, 50)
  log('render', component, 'render', props)
}

export function devMount(component: string) {
  log('mount', component, 'mounted')
}

export function devUnmount(component: string) {
  log('unmount', component, 'unmounted')
}

export function devEffect(component: string, label: string, deps?: unknown) {
  log('effect', component, `effect[${label}]`, deps)
}

export function devState(component: string, field: string, prev: unknown, next: unknown) {
  if (!ENABLED) return
  log('state', component, `${field}: ${JSON.stringify(prev)} → ${JSON.stringify(next)}`)
}

export function devFetchStart(component: string, label: string) {
  log('fetch', component, `${label} started`)
}

export function devFetchEnd(component: string, label: string, result: { count?: number; error?: string }) {
  if (result.error) {
    log('fetch', component, `${label} FAILED`, result.error)
  } else {
    log('fetch', component, `${label} resolved (${result.count ?? '?'} items)`)
  }
}

export function devNav(from: string, to: string) {
  log('nav', 'Router', `${from} → ${to}`)
}

// ── Layout shift observer (auto-starts in dev) ─────────────────────────────

export function devInitLayoutObserver() {
  if (!ENABLED) return
  if (typeof PerformanceObserver === 'undefined') return

  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value?: number
          sources?: Array<{
            node?: Node | null
            previousRect?: DOMRectReadOnly
            currentRect?: DOMRectReadOnly
          }>
        }
        const sources = shift.sources?.map(s => ({
          node: s.node instanceof HTMLElement
            ? `${s.node.tagName.toLowerCase()}.${s.node.className?.toString().slice(0, 40) || '(no class)'}`
            : s.node?.nodeName ?? '(unknown)',
          from: s.previousRect ? `${Math.round(s.previousRect.x)},${Math.round(s.previousRect.y)} ${Math.round(s.previousRect.width)}x${Math.round(s.previousRect.height)}` : null,
          to: s.currentRect ? `${Math.round(s.currentRect.x)},${Math.round(s.currentRect.y)} ${Math.round(s.currentRect.width)}x${Math.round(s.currentRect.height)}` : null,
        }))
        log('perf', 'LayoutShift', `shift=${(shift.value ?? 0).toFixed(4)}`, sources)
      }
    })
    obs.observe({ type: 'layout-shift', buffered: true })
  } catch {
    // layout-shift observer not supported in this browser
  }
}

// ── DOM mutation observer (attach to a container) ──────────────────────────
// Batches sequential mutations from the same MutationObserver callback into
// a single summary log line instead of one per node.

let mutationObs: MutationObserver | null = null

export function devInitMutationObserver(root: HTMLElement) {
  if (!ENABLED) return
  if (mutationObs) mutationObs.disconnect()

  mutationObs = new MutationObserver((mutations) => {
    const targets = new Map<string, { added: number; removed: number }>()

    for (const m of mutations) {
      if (m.type === 'childList') {
        const added = m.addedNodes.length
        const removed = m.removedNodes.length
        if (added || removed) {
          const target = m.target instanceof HTMLElement
            ? `${m.target.tagName.toLowerCase()}.${m.target.className?.toString().slice(0, 30) || '(no class)'}`
            : m.target.nodeName
          const entry = targets.get(target) ?? { added: 0, removed: 0 }
          entry.added += added
          entry.removed += removed
          targets.set(target, entry)
        }
      }
    }

    if (targets.size === 0) return

    const parts = Array.from(targets.entries()).map(
      ([target, { added, removed }]) => `+${added}/-${removed} in ${target}`
    )
    log('dom', 'MutationObserver', parts.join(', '))
  })
  mutationObs.observe(root, { childList: true, subtree: true })
}
