---
name: display-primitives
description: Use when rendering entity display content in Detail, Card, or WizardCard components. Enforces use of shared UI primitives. Required before writing any JSX in entity display components.
---

# Display Primitives — Agent Instructions

## The Rule

All typographic layout markup in `Detail`, `Card`, and `WizardCard` components **MUST** use components from `src/components/ui`. Raw Tailwind for typographic layout (font weights, text colors, spacing within text, lists, labeled sections) is **forbidden** in entity display components.

Layout utilities (flex, grid, gap, padding, margin for structural spacing) are fine to use directly.

## Import

```tsx
import { DetailSection, KeyValue, BulletList, Badge } from '@/components/ui'
// or pick what you need:
import { Badge } from '@/components/ui'
```

---

## Arcanum Primitive Components

- `DetailSection`
- `KeyValue`
- `BulletList`
- `Badge`

### `DetailSection` — titled content block

Use for any section with a heading followed by content.

```tsx
<DetailSection title="Class Skills">
  <p className="text-sm text-gray-800">{classSkills.join(', ')}</p>
</DetailSection>

<DetailSection title="Special Abilities" spacing="tight">
  <BulletList items={specialAbilities} />
</DetailSection>
```

**Props:**
- `title: string` — the section heading text
- `children: ReactNode` — content rendered below the heading
- `spacing?: "tight" | "normal"` — `"normal"` (default) = `mb-2` on h3, `"tight"` = `mb-1`

**Use when:** You have a labeled section with a title and body content.

---

### `KeyValue` — label + value pair

Use for any labeled data field. Three layout variants cover all patterns.

```tsx
// Row (default) — fixed-width label, value beside it
<KeyValue label="Key Ability" value={ability} />
<KeyValue label="Trained Only" value="Yes" />

// Inline — label and value on one line, no fixed width
<KeyValue label="HD" value="d8" layout="inline" />
<KeyValue label="BAB" value={<span className="capitalize">{bab}</span>} layout="inline" />

// Block — label above value
<KeyValue label="Description" value={desc} layout="block" />
```

**Props:**
- `label: string` — the field name
- `value: ReactNode` — the field value (string, number, or JSX)
- `layout?: "row" | "inline" | "block"` — default `"row"`

**Choose layout by context:**
- `"row"` — for stacked key-value lists (skill properties, character stats)
- `"inline"` — for horizontal stat strips, or label+value on one line
- `"block"` — for label above multi-line value

---

### `BulletList` — bulleted list

Use for arrays of items that should appear as a bulleted list.

```tsx
// Simple strings
<BulletList items={traits} />

// Custom render
<BulletList
  items={abilities}
  renderItem={(a) => <><strong>{a.name}</strong>: {a.desc}</>}
/>

// Compact spacing
<BulletList items={specialAbilities} spacing="tight" />
```

**Props:**
- `items: T[]` — array of any type
- `renderItem?: (item: T, i: number) => ReactNode` — defaults to `String(item)`
- `spacing?: "tight" | "normal"` — `"normal"` (default) = `space-y-1`, `"tight"` = `space-y-0.5`

**Do NOT use** for unbulleted lists or lists where items have structured label+value content. See the gap sentinel protocol below.

---

### `Badge` — colored pill/chip

Use for tags, categories, flags, and status indicators.

```tsx
<Badge variant="amber">+2 STR</Badge>      // ability bonuses, feat tags
<Badge variant="blue">Trained Only</Badge>  // skill flags, boolean indicators
<Badge variant="purple">Prestige</Badge>    // class subtype, special category
<Badge>Default</Badge>                      // neutral gray
```

**Props:**
- `variant?: "amber" | "blue" | "purple" | "gray"` — default `"gray"`
- `children: ReactNode` — the badge label

**Render multiple badges** inside a `<div className="flex flex-wrap gap-1">` container.

---

## When You Can't Express Something

If a display pattern cannot be expressed with these four components, you **MUST NOT** reach for raw Tailwind. Instead:

1. Leave a sentinel comment where the markup would go:

```tsx
{/* DISPLAY-PRIMITIVE-MISSING: [describe the pattern you need]
    Example: unbulleted list with inline font-medium labels per item (like physical stats: Size, Height, Weight) */}
```

2. Leave the section unimplemented (render nothing, or a `null`).

3. Report the gap to the user with a clear description of what pattern is needed.

The sentinel is machine-scannable. Run `grep -r "DISPLAY-PRIMITIVE-MISSING" src/` to find gaps that need new primitives.

---

## What NOT to Write

These patterns are banned in Detail/Card/WizardCard:

```tsx
// ❌ Raw section header
<h3 className="font-semibold text-gray-700 mb-2">Title</h3>

// ❌ Raw key-value
<div className="flex gap-2 text-sm">
  <span className="font-semibold text-gray-700 w-40">Label</span>
  <span className="text-gray-800">{value}</span>
</div>

// ❌ Raw bulleted list
<ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
  {items.map((item) => <li key={item}>{item}</li>)}
</ul>

// ❌ Raw badge/chip
<span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
  {tag}
</span>
```

Use the primitives instead. If you find yourself writing any of these, stop and use the component.
