/**
 * Platform abstraction layer.
 *
 * All Tauri-vs-web branching lives here. The rest of the app imports from
 * this module and never touches `@tauri-apps/api` or `isTauri` directly.
 */

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** True when running inside the Tauri desktop shell. */
export const isTauri = IS_TAURI

// ── IPC / fetch bridge ──────────────────────────────────────────────────────

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  return res.json() as Promise<T>
}

type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
let tauriInvoke: InvokeFn | null = null

if (IS_TAURI) {
  // Dynamic import so the Tauri module is never loaded in the web build.
  import('@tauri-apps/api/core').then(mod => { tauriInvoke = mod.invoke })
}

/**
 * Call a Tauri IPC command or fall back to a JSON endpoint.
 *
 * @param cmd     Tauri command name (e.g. `get_entities_by_type`)
 * @param args    Arguments forwarded to `invoke(cmd, args)`
 * @param webPath REST path used in web mode (e.g. `/_entities/by-type/race`)
 */
export async function ipc<T>(
  cmd: string,
  args: Record<string, unknown>,
  webPath: string,
): Promise<T> {
  if (!IS_TAURI) return fetchJson<T>(webPath)
  if (!tauriInvoke) {
    // Module hasn't loaded yet (race on first call) — await it inline.
    const mod = await import('@tauri-apps/api/core')
    tauriInvoke = mod.invoke
  }
  return tauriInvoke<T>(cmd, args)
}

/**
 * Call a Tauri IPC command (no web fallback).
 * Throws if called in web mode.
 */
export async function ipcOnly<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!IS_TAURI) throw new Error(`ipcOnly("${cmd}") called in web mode — no fallback available`)
  if (!tauriInvoke) {
    const mod = await import('@tauri-apps/api/core')
    tauriInvoke = mod.invoke
  }
  return tauriInvoke<T>(cmd, args)
}
