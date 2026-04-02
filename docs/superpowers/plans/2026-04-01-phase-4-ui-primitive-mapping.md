# Phase 4: UI Primitive Mapping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded character sheet and entity display with data-driven layout entities, slot-based view modes, and theme entities. The engine provides rendering primitives; content packs define what renders and how.

**Architecture:** Layouts compose UI primitives into sections. View modes map entity property paths into named slots on templates. Themes define CSS custom property values. The rendering pipeline: Content Pack Load → resolve view_mode + layout + theme → engine constructs render tree → frontend renders primitives. This is the culmination of all previous phases — the content pack IS the UI.

**Tech Stack:** React + TypeScript + TailwindCSS, MDX frontmatter, Tauri IPC

**Prerequisites:** Phase 1 (mechanic entities, computed views), Phase 2 (expressions, subscriptions), Phase 3 (workflows in content). The slot-based view modes from Phase 4 directly consume the mechanic entities from Phase 1.

---

### Task 1: Define built-in UI primitive components

**Files:**
- Create: `src/components/primitives/ComputedField.tsx`
- Create: `src/components/primitives/ProgressBar.tsx`
- Create: `src/components/primitives/DataTable.tsx`
- Create: `src/components/primitives/Block.tsx`
- Create: `src/components/primitives/EntityList.tsx`
- Create: `src/components/primitives/TextField.tsx`
- Create: `src/components/primitives/NarrativeBlock.tsx`
- Create: `src/components/primitives/EntitySelector.tsx`
- Create: `src/components/primitives/ImageBlock.tsx`
- Create: `src/components/primitives/Divider.tsx`

- [ ] **Step 1: Implement all 10 UI primitives**

Each primitive is a React component that receives a config object from the layout/view mode definition. All are pure display components — no direct engine communication except through IPC.

```tsx
// src/components/primitives/ComputedField.tsx
interface ComputedFieldProps {
  label: string;
  value: string | number;
  className?: string;
}

export function ComputedField({ label, value, className = "" }: ComputedFieldProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xs text-gray-400 uppercase">{label}</span>
      <span className="text-lg font-mono text-white">{value}</span>
    </div>
  );
}
```

```tsx
// src/components/primitives/ProgressBar.tsx
interface ProgressBarProps {
  label: string;
  current: number;
  max: number;
  segments?: number;
}

export function ProgressBar({ label, current, max, segments = 10 }: ProgressBarProps) {
  const filled = Math.round((current / max) * segments);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-white">{current}/{max}</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 rounded-sm ${
              i < filled ? "bg-green-600" : "bg-gray-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

Continue similarly for all remaining primitives: `DataTable`, `Block`, `EntityList`, `TextField`, `NarrativeBlock`, `EntitySelector`, `ImageBlock`, `Divider`.

- [ ] **Step 2: Write tests for primitives**

```tsx
// src/components/primitives/ComputedField.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ComputedField } from "./ComputedField";

describe("ComputedField", () => {
  it("renders label and value", () => {
    render(<ComputedField label="Strength" value={16} />);
    expect(screen.getByText("Strength")).toBeTruthy();
    expect(screen.getByText("16")).toBeTruthy();
  });

  it("renders string values", () => {
    render(<ComputedField label="Class" value="Fighter" />);
    expect(screen.getByText("Fighter")).toBeTruthy();
  });
});
```

Run tests after each implementation. All primitives should have test coverage.

- [ ] **Step 3: Commit primitives**

Run:
```bash
git add src/components/primitives/
git commit -m "feat: add 10 built-in UI primitive components"
```

---

### Task 2: Slot-based view mode renderer

**Files:**
- Create: `src/hooks/useViewMode.ts`
- Create: `src/components/ViewModeRenderer.tsx`
- Create: `src/components/viewmodes/CardView.tsx`
- Create: `src/components/viewmodes/ReferenceView.tsx`
- Create: `src/components/viewmodes/TableRowView.tsx`
- Create: `src/components/viewmodes/BattlemapView.tsx`
- Create: `src/components/viewmodes/DMScreenView.tsx`

- [ ] **Step 1: Write failing test for view mode resolution**

```tsx
// src/components/ViewModeRenderer.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ViewModeRenderer } from "./ViewModeRenderer";

describe("ViewModeRenderer", () => {
  const mockEntity = {
    id: "srd:spell:fireball",
    entity_type: "actionable.spell",
    properties: {
      name: "Fireball",
      school: "evocation",
      spell_level: 3,
      components: ["V", "S", "M"],
    },
    computed_views: {
      "abilities.str.modifier": 3,
    },
  };

  const mockViewMode = {
    id: "srd:view:spell-card",
    template: "card",
    slots: {
      title: { path: "name" },
      subtitle: { path: "school", label: "School" },
      badge: { path: "spell_level", label: "Level" },
    },
  };

  it("renders entity in card view mode using slot mapping", () => {
    render(
      <ViewModeRenderer
        entity={mockEntity}
        viewMode={mockViewMode}
      />
    );
    expect(screen.getByText("Fireball")).toBeTruthy();
    expect(screen.getByText("evocation")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/ViewModeRenderer.test.tsx
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement ViewModeRenderer**

```tsx
// src/components/ViewModeRenderer.tsx
import { CardView } from "./viewmodes/CardView";
import { ReferenceView } from "./viewmodes/ReferenceView";
import { TableRowView } from "./viewmodes/TableRowView";
import { BattlemapView } from "./viewmodes/BattlemapView";
import { DMScreenView } from "./viewmodes/DMScreenView";
import type { ViewMode, Entity } from "../types";

interface ViewModeRendererProps {
  entity: Entity;
  viewMode: ViewMode;
  theme?: Record<string, string>;
}

export function ViewModeRenderer({ entity, viewMode, theme }: ViewModeRendererProps) {
  // Resolve property values from entity using slot paths
  const resolveSlot = (path: string) => {
    const parts = path.split(".");
    let value: unknown = entity.properties;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else if (entity.computed_views && part in entity.computed_views) {
        value = entity.computed_views[part];
      } else {
        return undefined;
      }
    }
    return value;
  };

  const resolvedSlots: Record<string, { value: unknown; label?: string; path?: string }> = {};
  for (const [slotName, slotConfig] of Object.entries(viewMode.slots || {})) {
    if (slotConfig === null) {
      resolvedSlots[slotName] = { value: null };
      continue;
    }
    resolvedSlots[slotName] = {
      value: resolveSlot(slotConfig.path || slotName),
      label: slotConfig.label,
      path: slotConfig.path,
    };
  }

  const props = { entity, slots: resolvedSlots, theme };

  switch (viewMode.template) {
    case "card":
      return <CardView {...props} />;
    case "reference":
      return <ReferenceView {...props} />;
    case "table-row":
      return <TableRowView {...props} />;
    case "battlemap":
      return <BattlemapView {...props} />;
    case "dm-screen":
      return <DMScreenView {...props} />;
    default:
      return <CardView {...props} />;
  }
}
```

- [ ] **Step 4: Implement view mode templates**

Each template is a React component that renders its named slots in a specific layout:

```tsx
// src/components/viewmodes/CardView.tsx
interface CardViewProps {
  entity: Entity;
  slots: Record<string, { value: unknown; label?: string }>;
  theme?: Record<string, string>;
}

export function CardView({ entity, slots }: CardViewProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer">
      {slots.thumbnail?.value && (
        <div className="w-full h-32 bg-gray-700 rounded mb-3 overflow-hidden">
          <img
            src={String(slots.thumbnail.value)}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {slots.title?.value && (
        <h3 className="text-lg font-semibold text-white">{String(slots.title.value)}</h3>
      )}
      {slots.subtitle?.value && (
        <p className="text-sm text-gray-400">{slots.subtitle.label}: {String(slots.subtitle.value)}</p>
      )}
      {slots.badge?.value && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-900 text-blue-200 text-xs rounded">
          {slots.badge.label}: {String(slots.badge.value)}
        </span>
      )}
      {slots.short_desc?.value && (
        <p className="text-sm text-gray-300 mt-2 line-clamp-2">
          {String(slots.short_desc.value)}
        </p>
      )}
    </div>
  );
}
```

Implement `ReferenceView` (full art, full description), `TableRowView` (compact single-line), `BattlemapView` (token + combat stats), `DMScreenView` (quick reference grid) following the same pattern.

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
npx vitest run src/components/ViewModeRenderer.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:
```bash
git add src/hooks/useViewMode.ts src/components/ViewModeRenderer.tsx src/components/viewmodes/
git commit -m "feat: add slot-based ViewModeRenderer with card, reference, table-row, battlemap, dm-screen templates"
```

---

### Task 3: Layout entity rendering engine

**Files:**
- Create: `src/components/LayoutRenderer.tsx`
- Create: `src/components/LayoutRenderer.test.tsx`

- [ ] **Step 1: Write failing test for layout rendering**

```tsx
// src/components/LayoutRenderer.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LayoutRenderer } from "./LayoutRenderer";

describe("LayoutRenderer", () => {
  const mockLayout = {
    id: "srd:layout:character-sheet",
    sections: [
      {
        id: "identity",
        component: "block",
        title: "Identity",
        children: [
          { id: "name", component: "text-field", path: "identity.name" },
          { id: "race-class", component: "computed-field", formula: "class_levels", label: "Class" },
        ],
      },
      {
        id: "abilities",
        component: "block",
        title: "Ability Scores",
        children: [
          { id: "str", component: "computed-field", label: "STR", path: "abilities.str.score" },
        ],
      },
    ],
  };

  const mockCharacter = {
    properties: {
      "identity.name": "Gimlet",
      "class_levels": "Fighter 5",
      "abilities.str.score": 16,
    },
    computed_views: {},
  };

  it("renders layout sections with title", () => {
    render(<LayoutRenderer layout={mockLayout} character={mockCharacter} />);
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("Ability Scores")).toBeTruthy();
  });

  it("renders text-field primitive", () => {
    render(<LayoutRenderer layout={mockLayout} character={mockCharacter} />);
    expect(screen.getByText("Gimlet")).toBeTruthy();
  });

  it("renders computed-field primitive", () => {
    render(<LayoutRenderer layout={mockLayout} character={mockCharacter} />);
    expect(screen.getByText("STR")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/LayoutRenderer.test.tsx
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement LayoutRenderer**

```tsx
// src/components/LayoutRenderer.tsx
import { ComputedField } from "./primitives/ComputedField";
import { Block } from "./primitives/Block";
import { TextField } from "./primitives/TextField";
import { ProgressBar } from "./primitives/ProgressBar";
import { DataTable } from "./primitives/DataTable";
import { EntityList } from "./primitives/EntityList";
import { NarrativeBlock } from "./primitives/NarrativeBlock";
import { Divider } from "./primitives/Divider";
import type { Layout, LayoutSection, Character } from "../types";

interface LayoutRendererProps {
  layout: Layout;
  character: Character;
  onChange?: (path: string, value: unknown) => void;
}

export function LayoutRenderer({ layout, character, onChange }: LayoutRendererProps) {
  return (
    <div className="space-y-6 p-4">
      {layout.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          character={character}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function SectionRenderer({
  section,
  character,
  onChange,
}: {
  section: LayoutSection;
  character: Character;
  onChange?: (path: string, value: unknown) => void;
}) {
  const resolve = (path: string): unknown => {
    return character.properties[path] ?? character.computed_views?.[path];
  };

  if (section.component === "block") {
    return (
      <Block title={section.title}>
        <div className={section.children?.length > 1 ? "grid grid-cols-2 gap-4" : ""}>
          {section.children?.map((child) => (
            <ChildRenderer
              key={child.id}
              child={child}
              resolve={resolve}
              onChange={onChange}
            />
          ))}
        </div>
      </Block>
    );
  }

  // Other section components
  return null;
}

function ChildRenderer({
  child,
  resolve,
  onChange,
}: {
  child: LayoutSection["children"][number];
  resolve: (path: string) => unknown;
  onChange?: (path: string, value: unknown) => void;
}) {
  switch (child.component) {
    case "computed-field":
      return (
        <ComputedField
          label={child.label || ""}
          value={resolve(child.path || child.formula || "") ?? "—"}
        />
      );
    case "text-field":
      return (
        <TextField
          label={child.label || ""}
          value={String(resolve(child.path || "") ?? "")}
          onChange={(v) => child.path && onChange?.(child.path, v)}
        />
      );
    case "progress-bar":
      return (
        <ProgressBar
          label={child.label || ""}
          current={Number(resolve(child.path || "0"))}
          max={Number(resolve(child.max_path || "1"))}
        />
      );
    case "table":
      return (
        <DataTable
          headers={child.headers || []}
          rows={resolve(child.rows_path || "") ?? []}
        />
      );
    case "list":
      return (
        <EntityList
          items={resolve(child.source_path || "") ?? []}
          itemViewMode={child.item_view_mode}
        />
      );
    case "divider":
      return <Divider />;
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/components/LayoutRenderer.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/components/LayoutRenderer.tsx src/components/LayoutRenderer.test.tsx
git commit -m "feat: add layout entity rendering engine with section/primitive composition"
```

---

### Task 4: D&D 3.5e character sheet layout entity

**Files:**
- Create: `content/packs/srd-3.5e/layouts/character-sheet.mdx`

- [ ] **Step 1: Create character sheet layout MDX**

This is the content that defines the entire character sheet UI — no hardcoded React layout.

```yaml
---
id: "srd:layout:character-sheet"
entity_type: "layout"
extends: "template:layout"
properties:
  name: "D&D 3.5e Character Sheet"
  default_view_mode: "srd:view:dm-screen"

  sections:
    - id: "identity"
      component: block
      title: "Identity"
      children:
        - id: "name"
          component: text-field
          path: "identity.name"
          label: "Name"
        - id: "race-class"
          component: computed-field
          formula: "template.name + ' ' + class_levels"
          label: "Race & Class"

    - id: "abilities"
      component: block
      title: "Ability Scores"
      children:
        - id: "str"
          component: computed-field
          path: "abilities.str.score"
          label: "STR"
        - id: "dex"
          component: computed-field
          path: "abilities.dex.score"
          label: "DEX"
        - id: "con"
          component: computed-field
          path: "abilities.con.score"
          label: "CON"
        - id: "int"
          component: computed-field
          path: "abilities.int.score"
          label: "INT"
        - id: "wis"
          component: computed-field
          path: "abilities.wis.score"
          label: "WIS"
        - id: "cha"
          component: computed-field
          path: "abilities.cha.score"
          label: "CHA"

    - id: "combat"
      component: block
      title: "Combat"
      children:
        - id: "hp"
          component: progress-bar
          path: "combat.hp"
          max_path: "combat.max_hp"
          label: "Hit Points"
        - id: "ac"
          component: computed-field
          formula: "10 + abilities.dex.modifier + armor.bonus + shield.bonus"
          label: "AC"
        - id: "bab"
          component: table
          headers: ["Attack", "Bonus"]
          rows_path: "combat.iterative_attacks"
        - id: "saves"
          component: table
          headers: ["Save", "Base", "Ability", "Misc", "Total"]
          rows_path: "combat.saves_summary"

    - id: "skills"
      component: block
      title: "Skills"
      children:
        - id: "skill-list"
          component: list
          item_view_mode: "srd:view:table-row"
          source_path: "skills"
          filter: "is_class_skill or (rank > 0)"

    - id: "feats"
      component: block
      title: "Feats"
      children:
        - id: "feat-list"
          component: list
          item_view_mode: "srd:view:card"
          source_path: "feats"

    - id: "spells"
      component: block
      title: "Spells"
      children:
        - id: "spell-list"
          component: list
          item_view_mode: "srd:view:spell-card"
          source_path: "spells_known"
---
```

- [ ] **Step 2: Run pack test to verify layout parses**

Run:
```bash
cd src-tauri && cargo run -- pack test ../content/packs/srd-3.5e/
```

Expected: Layout entity passes schema validation.

- [ ] **Step 3: Commit**

Run:
```bash
git add content/packs/srd-3.5e/layouts/
git commit -m "feat: add D&D 3.5e character sheet layout entity"
```

---

### Task 5: Theme entity and CSS custom properties

**Files:**
- Create: `src/hooks/useTheme.ts`
- Modify: `src/App.tsx` (apply theme CSS variables)
- Create: `content/packs/srd-3.5e/styling/theme.mdx`

- [ ] **Step 1: Create default theme entity**

```yaml
# content/packs/srd-3.5e/styling/theme.mdx
---
id: "srd:styling:theme"
entity_type: "styling"
properties:
  name: "SRD Default Theme"
  colors:
    primary: "#1e40af"
    secondary: "#7c3aed"
    accent: "#f59e0b"
    background: "#0f172a"
    surface: "#1e293b"
    text: "#f1f5f9"
    text_muted: "#94a3b8"
    error: "#dc2626"
    warning: "#f59e0b"
    success: "#16a34a"
    border: "#334155"
  typography:
    heading_font: "Cinzel"
    body_font: "Merriweather"
    mono_font: "Fira Code"
    heading_scale: 1.25
    body_size: 16px
    line_height: 1.6
  spacing:
    base_unit: 4
    component_gap: 16
    section_gap: 24
    page_margin: 32
  effects:
    card_shadow: "0 4px 12px rgba(0,0,0,0.3)"
    border_radius: 6
    border_style: "default"
---
```

- [ ] **Step 2: Implement theme application hook**

```tsx
// src/hooks/useTheme.ts
import { useEffect } from "react";
import type { Theme } from "../types";

export function useTheme(theme: Theme) {
  useEffect(() => {
    if (!theme) return;

    const root = document.documentElement;
    const { colors, typography, spacing, effects } = theme.properties;

    // Apply colors as CSS custom properties
    if (colors) {
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, String(value));
      });
    }

    // Apply typography
    if (typography) {
      root.style.setProperty("--font-heading", typography.heading_font || "inherit");
      root.style.setProperty("--font-body", typography.body_font || "inherit");
      root.style.setProperty("--font-mono", typography.mono_font || "monospace");
    }

    // Apply spacing
    if (spacing) {
      Object.entries(spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, `${value}px`);
      });
    }
  }, [theme]);
}
```

- [ ] **Step 3: Wire theme loading from campaign pack**

Modify `App.tsx` or the campaign loading logic to:
1. Load the active campaign's theme entity
2. Call `useTheme(theme)`

- [ ] **Step 4: Run tests**

Run:
```bash
npx vitest run src/hooks/useTheme.test.tsx
```

Expected: Tests pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/hooks/useTheme.ts src/App.tsx content/packs/srd-3.5e/styling/theme.mdx
git commit -m "feat: add theme entity and CSS custom property application hook"
```

---

### Task 6: Replace hardcoded entity display with view mode rendering

**Files:**
- Modify: `src/routes/EntityDetail.tsx`
- Modify: `src/routes/EntityList.tsx`
- Modify: `src/routes/CharacterSheet.tsx`

- [ ] **Step 1: Update EntityDetail to use ViewModeRenderer**

Replace the hardcoded entity rendering with:

```tsx
// src/routes/EntityDetail.tsx
export function EntityDetail() {
  const { entityType, id } = useParams();
  const entity = useEntity(`${entityType}:${id}`); // IPC call to load entity
  const viewMode = useViewMode(entityType, "reference"); // IPC call to get default view mode

  if (!entity || !viewMode) return <LoadingSpinner />;

  return <ViewModeRenderer entity={entity} viewMode={viewMode} />;
}
```

- [ ] **Step 2: Update EntityList to use card view mode**

```tsx
// src/routes/EntityList.tsx
export function EntityList() {
  const entities = useEntities(entityType); // IPC call
  const cardViewMode = useViewMode(entityType, "card");

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {entities.map((entity) => (
        <ViewModeRenderer
          key={entity.id}
          entity={entity}
          viewMode={cardViewMode}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update CharacterSheet to use LayoutRenderer**

```tsx
// src/routes/CharacterSheet.tsx
export function CharacterSheet() {
  const character = useCharacter(characterId);
  const layout = useLayout("srd:layout:character-sheet"); // IPC call

  if (!character || !layout) return <LoadingSpinner />;

  return (
    <LayoutRenderer
      layout={layout}
      character={character}
      onChange={(path, value) => updateCharacter(characterId, path, value)}
    />
  );
}
```

- [ ] **Step 4: Run and verify**

Run dev mode and verify entity browsing, character sheet, and all views render correctly using the data-driven approach.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/routes/EntityDetail.tsx src/routes/EntityList.tsx src/routes/CharacterSheet.tsx
git commit -m "refactor: replace hardcoded entity/character rendering with view mode and layout entity rendering"
```

---

### Task 7: Phase 4 verification

- [ ] **Step 1: Run full test suite**

Run:
```bash
pnpm run test
cd src-tauri && cargo test
pnpm run test:e2e
```

Expected: All tests pass.

- [ ] **Step 2: Visual verification in browser**

Open the app and verify:
- Entity list renders cards with correct slot content
- Entity detail renders reference view with full art and description
- Character sheet renders all sections with computed values updating live
- Theme CSS variables apply correctly (colors, fonts)

- [ ] **Step 3: Tag Phase 4 complete**

Run:
```bash
git tag phase-4-complete
```
