# Display Primitives Design

**Date:** 2026-03-29
**Status:** Implemented
**Scope:** Entity display components — Detail, Card, WizardCard

---

## Problem

Entity detail components (ClassDetail, SkillDetail, SpellDetail, RaceDetail, FeatDetail) and their Card/WizardCard siblings contained 40–50% duplicated JSX. Three incompatible key-value layouts, four inconsistent section header patterns, and ad-hoc badge/chip markup were copied verbatim across files. Every new agent replicated the mess.

---

## Solution

Four opinionated compound components in `src/components/ui/`. Styles are strictly internal — agents use the components, never raw Tailwind for typographic layout in display contexts.

---

## Components

### `DetailSection`

A titled content block. Owns the `<section>` wrapper and `<h3>` styling.

```tsx
import { DetailSection } from '@/components/ui'

<DetailSection title="Class Skills">
  <p className="text-sm text-gray-800">{classSkills.join(', ')}</p>
</DetailSection>

<DetailSection title="Entry Requirements" spacing="tight">
  <p className="text-sm text-gray-800">{entryRequirements}</p>
</DetailSection>
```

**Props:** `title: string`, `children: ReactNode`, `spacing?: "tight" | "normal"` (default `"normal"`)
- `"normal"` → `mb-2` on the h3 (standard sections)
- `"tight"` → `mb-1` on the h3 (compact sections like ClassDetail stats)

---

### `KeyValue`

A label+value pair. Three layouts cover all current patterns.

```tsx
import { KeyValue } from '@/components/ui'

// Row (default) — flex with fixed-width label, used in SkillDetail
<KeyValue label="Key Ability" value={ability} />
<KeyValue label="Trained Only" value="Yes" />

// Inline — label and value on one line, used in stat strips and SpellDetail
<KeyValue label="HD" value="d8" layout="inline" />
<KeyValue label="School" value={school} layout="inline" />

// Block — label above value
<KeyValue label="Description" value={desc} layout="block" />
```

**Props:** `label: string`, `value: ReactNode`, `layout?: "row" | "inline" | "block"` (default `"row"`)

---

### `BulletList`

A `<ul>` with consistent disc/inside/sm/gray-800 styling.

```tsx
import { BulletList } from '@/components/ui'

// Simple string list
<BulletList items={traits} />

// Custom render per item
<BulletList
  items={abilities}
  renderItem={(a) => <><strong>{a.name}</strong>: {a.desc}</>}
/>

// Compact spacing (for dense content)
<BulletList items={specialAbilities} spacing="tight" />
```

**Props:** `items: T[]`, `renderItem?: (item: T, i: number) => ReactNode`, `spacing?: "tight" | "normal"` (default `"normal"`)
- `"normal"` → `space-y-1`
- `"tight"` → `space-y-0.5`

---

### `Badge`

A colored pill/chip for tags, categories, and status indicators.

```tsx
import { Badge } from '@/components/ui'

<Badge variant="amber">+2 STR</Badge>    // ability bonuses, feat tags
<Badge variant="blue">Trained Only</Badge>  // skill flags
<Badge variant="purple">Prestige</Badge>    // class subtype
<Badge>Default</Badge>                      // neutral/gray
```

**Props:** `variant?: "amber" | "blue" | "purple" | "gray"` (default `"gray"`), `children: ReactNode`

---

## Known Gaps

One `DISPLAY-PRIMITIVE-MISSING` sentinel exists in `race/Detail.tsx`:

```tsx
{/* DISPLAY-PRIMITIVE-MISSING: unstyled list with inline font-medium labels (Size, Height, Weight).
    BulletList forces list-disc list-inside which is wrong here. */}
```

**Pattern needed:** A plain `<ul>` (no bullets) where each `<li>` has a `font-medium` inline label. Could be addressed by adding `bullets?: boolean` to `BulletList`, or a separate `PropList` component.

---

## File Locations

| File | Role |
|------|------|
| `src/components/ui/Badge.tsx` | Badge component |
| `src/components/ui/Badge.test.tsx` | Badge tests |
| `src/components/ui/BulletList.tsx` | BulletList component |
| `src/components/ui/BulletList.test.tsx` | BulletList tests |
| `src/components/ui/KeyValue.tsx` | KeyValue component |
| `src/components/ui/KeyValue.test.tsx` | KeyValue tests |
| `src/components/ui/DetailSection.tsx` | DetailSection component |
| `src/components/ui/DetailSection.test.tsx` | DetailSection tests |
| `src/components/ui/index.ts` | Barrel export |
| `src/lib/types.ts` | Prop interfaces |
| `docs/superpowers/skills/display-primitives.md` | Agent skill file |
