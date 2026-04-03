# App Components Sidebar — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Context

During wizard development, verifying individual step components requires running the full creation flow. There is no isolated way to inspect a component with sample data or observe what it emits on submit. This spec adds a developer-only "App Components" section to the sidebar (web build only) that renders any registered wizard component in isolation, with fixture data, and logs callback payloads to an output panel below the component.

## Architecture

Four new files, two modified:

| File | Role |
|------|------|
| `src/lib/isTauri.ts` | Shared `isTauri()` one-liner, extracted from `engine.ts` |
| `src/dev/componentRegistry.tsx` | Map of URL slug → `{ label, component, defaultProps }` |
| `src/routes/ComponentPlayground.tsx` | Route that renders a component with fixtures + output log |
| `src/components/Sidebar.tsx` | Adds "App Components" section, hidden in Tauri build |
| `src/App.tsx` | Adds `/dev/components/:name` route, hidden in Tauri build |

## Component Registry (`src/dev/componentRegistry.tsx`)

```ts
type RegistryEntry = {
  label: string
  component: React.ComponentType<any>
  defaultProps: Record<string, unknown>
}

const registry: Record<string, RegistryEntry> = { ... }
```

- Keyed by URL slug (e.g. `"race-step"`, `"roll-abilities"`)
- `defaultProps` provides minimal-but-valid fixture data sufficient to render without crashing
  - Entity arrays: 2–3 stub objects with `id`, `name`, `entity_type`, `body` fields
  - Ability scores: `[15, 14, 13, 12, 10, 8]`
  - Strings: short plausible values (`"Thalindra"`, `"Neutral Good"`)
  - Numbers: valid defaults (`age: 25`, `gold: 100`)
- Callback props (`on*`) are **not** included in `defaultProps` — the playground wraps them

All 27 components in `src/components/wizard/` get entries.

## ComponentPlayground Route (`src/routes/ComponentPlayground.tsx`)

Route: `/dev/components/:name`

### Layout

```
┌────────────────────────────────────────┐
│  [Component rendered with fixture data] │
│                                         │
│  Output ─────────────────────────────  │
│  12:34:05  onSelectRace                 │
│  { id: "elf", name: "Elf", ... }        │
│                                [Clear]  │
└────────────────────────────────────────┘
```

### Behavior

1. Reads `:name` from URL params, looks up registry entry
2. Merges `defaultProps` with auto-wrapped callbacks:
   - All keys starting with `on` that are not in `defaultProps` are injected as interceptors
   - Each interceptor appends `{ callbackName, args, timestamp }` to a `useState` log array and calls through to the original if provided
3. Output panel renders log entries as syntax-highlighted JSON (or plain `<pre>` if keeping it simple)
4. "Clear" button resets the log array
5. Unknown `:name` renders a "Component not found" message
6. Styled to match existing parchment/dark theme (`background: var(--parchment-light)`, gold accents for panel header)

## Sidebar Changes (`src/components/Sidebar.tsx`)

- Import `isTauri` from `src/lib/isTauri.ts`
- Below the existing Compendium section, conditionally render an "App Components" section:
  - Same gold-rule separator pattern
  - Same `SECTION LABEL` style (Cinzel, 0.55rem, dimmed gold)
  - Same `NavLink` list style (active = red left border + bg)
  - Links point to `/dev/components/:slug` for each registry entry
- Only rendered when `!isTauri()`

## Routing Changes (`src/App.tsx`)

```tsx
import { isTauri } from './lib/isTauri'

// Inside <Routes>:
{!isTauri() && (
  <Route path="/dev/components/:name" element={<ComponentPlayground />} />
)}
```

`ComponentPlayground` is imported at the top of App.tsx but only tree-shaken from the Tauri build because the route is never registered.

## isTauri Extraction (`src/lib/isTauri.ts`)

```ts
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
```

`src/lib/engine.ts` is updated to import from this file rather than using the local private function.

## Verification

1. `npx vite dev` — sidebar shows "App Components" section; clicking any entry renders the component
2. Interact with a component (e.g. select a race) — output panel shows the callback name + payload
3. "Clear" button resets the output log
4. Navigate to `/dev/components/nonexistent` — shows "Component not found" message
5. `cargo tauri dev` — "App Components" section is absent from the sidebar; `/dev/components/*` routes return 404
6. `npx vitest run` — existing tests still pass (no regressions)
