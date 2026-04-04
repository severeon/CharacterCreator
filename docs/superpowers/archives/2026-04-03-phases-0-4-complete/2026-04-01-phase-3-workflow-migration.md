# Phase 3: Workflow Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded character creation wizard with a data-driven workflow stepper driven by workflow entities in content packs. Level-up, rest, and combat round workflows are also defined in content.

**Architecture:** The engine provides a generic `WorkflowStepper` component that reads a `workflow` entity and renders steps in order. Each step references a UI component (`ability-allocator`, `entity-selector`, `skill-allocator`, `text-form`, etc.) and a config. Step ordering and dependencies are entirely in the workflow entity — not in Rust or React. Campaign packs can override individual steps without reimplementing the whole workflow.

**Tech Stack:** React + TypeScript, MDX frontmatter, Tauri IPC

**Prerequisites:** Phase 1 (computed views, mechanic entities), Phase 2 (predicates, subscriptions), Phase 4 (UI primitives). The workflow stepper composes all UI primitives from Phase 4.

---

### Task 1: Generic workflow stepper engine

**Files:**
- Create: `src/components/wizard/WorkflowStepper.tsx`
- Create: `src/components/wizard/WorkflowStepper.test.tsx`
- Create: `src/hooks/useWorkflow.ts`

- [ ] **Step 1: Write failing test for workflow stepper**

```tsx
// src/components/wizard/WorkflowStepper.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WorkflowStepper } from "./WorkflowStepper";

describe("WorkflowStepper", () => {
  const mockWorkflow = {
    id: "test:workflow:simple",
    properties: {
      name: "Simple Workflow",
      steps: [
        {
          id: "step-1",
          name: "First Step",
          component: "text-form",
          config: { fields: ["name"] },
          required: true,
        },
        {
          id: "step-2",
          name: "Second Step",
          component: "entity-selector",
          config: { entity_type: "template.race" },
          required: true,
          depends_on: ["step-1"],
        },
        {
          id: "step-3",
          name: "Optional Step",
          component: "text-form",
          config: { fields: ["notes"] },
          required: false,
          depends_on: ["step-2"],
        },
      ],
    },
  };

  const mockState = {
    currentStep: 0,
    completed: [],
    data: {},
  };

  it("renders first step by default", () => {
    render(<WorkflowStepper workflow={mockWorkflow} state={mockState} onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByText("First Step")).toBeTruthy();
  });

  it("shows step 2 after advancing", () => {
    const { rerender } = render(
      <WorkflowStepper workflow={mockWorkflow} state={mockState} onNext={() => {}} onBack={() => {}} />
    );
    // Advance to step 2
    const nextState = { ...mockState, currentStep: 1 };
    rerender(<WorkflowStepper workflow={mockWorkflow} state={nextState} onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByText("Second Step")).toBeTruthy();
  });

  it("respects depends_on — step 2 not available until step 1 done", () => {
    // depends_on means the step's data can't be collected until dependencies are complete
    // The stepper should prevent advancing to step 2 before step 1
    const incompleteState = { ...mockState, currentStep: 0, completed: [] };
    render(<WorkflowStepper workflow={mockWorkflow} state={incompleteState} onNext={() => {}} onBack={() => {}} />);
    // Step 1 should be the only active step
    expect(screen.queryByText("Second Step")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/wizard/WorkflowStepper.test.tsx
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement WorkflowStepper**

```tsx
// src/components/wizard/WorkflowStepper.tsx
import type { Workflow, WorkflowState } from "../../types";
import { AbilityAllocator } from "./AbilityAllocator";
import { EntitySelector } from "./EntitySelector";
import { SkillAllocator } from "./SkillAllocator";
import { TextForm } from "./TextForm";
import { EquipmentAllocator } from "./EquipmentAllocator";

interface WorkflowStepperProps {
  workflow: Workflow;
  state: WorkflowState;
  onNext: (stepData: Record<string, unknown>) => void;
  onBack: () => void;
}

export function WorkflowStepper({ workflow, state, onNext, onBack }: WorkflowStepperProps) {
  const steps = workflow.properties.steps;
  const currentStepIndex = Math.min(state.currentStep, steps.length - 1);
  const currentStep = steps[currentStepIndex];

  // Check if dependencies are satisfied
  const dependenciesSatisfied = (step: Workflow["properties"]["steps"][number]) => {
    if (!step.depends_on) return true;
    return step.depends_on.every((depId) => state.completed.includes(depId));
  };

  const canAdvance = dependenciesSatisfied(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = (stepData: Record<string, unknown>) => {
    onNext({ ...state.data, [currentStep.id]: stepData });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step progress indicator */}
      <div className="flex gap-2 mb-6">
        {steps.map((step, i) => {
          const isComplete = state.completed.includes(step.id);
          const isCurrent = i === currentStepIndex;
          return (
            <div
              key={step.id}
              className={`flex-1 h-2 rounded ${
                isComplete ? "bg-green-600" : isCurrent ? "bg-blue-600" : "bg-gray-700"
              }`}
              title={step.name}
            />
          );
        })}
      </div>

      {/* Current step */}
      <div className="flex-1">
        <StepRenderer
          step={currentStep}
          stepData={state.data[currentStep.id]}
          disabled={!canAdvance}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-700">
        <button
          onClick={onBack}
          disabled={isFirstStep}
          className="px-4 py-2 text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
        >
          ← Back
        </button>
        {!isLastStep && (
          <button
            onClick={() => handleNext({})}
            disabled={!canAdvance}
            className="px-6 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
          >
            Next →
          </button>
        )}
        {isLastStep && (
          <button
            onClick={() => handleNext({})}
            className="px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

function StepRenderer({
  step,
  stepData,
  disabled,
}: {
  step: Workflow["properties"]["steps"][number];
  stepData: unknown;
  disabled: boolean;
}) {
  switch (step.component) {
    case "ability-allocator":
      return <AbilityAllocator config={step.config} initialData={stepData} disabled={disabled} />;
    case "entity-selector":
      return <EntitySelector config={step.config} initialData={stepData} disabled={disabled} />;
    case "skill-allocator":
      return <SkillAllocator config={step.config} initialData={stepData} disabled={disabled} />;
    case "text-form":
      return <TextForm config={step.config} initialData={stepData} disabled={disabled} />;
    case "equipment-allocator":
      return <EquipmentAllocator config={step.config} initialData={stepData} disabled={disabled} />;
    case "narrative-block":
      return <NarrativeBlock config={step.config} />;
    default:
      return <p className="text-gray-400">Unknown step component: {step.component}</p>;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/components/wizard/WorkflowStepper.test.tsx
```

Expected: Tests pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/components/wizard/WorkflowStepper.tsx src/components/wizard/WorkflowStepper.test.tsx src/hooks/useWorkflow.ts
git commit -m "feat: add generic workflow stepper engine driven by workflow entities"
```

---

### Task 2: Step component implementations

**Files:**
- Create: `src/components/wizard/AbilityAllocator.tsx`
- Create: `src/components/wizard/EntitySelector.tsx`
- Create: `src/components/wizard/SkillAllocator.tsx`
- Create: `src/components/wizard/TextForm.tsx`
- Create: `src/components/wizard/EquipmentAllocator.tsx`
- Create: `src/components/wizard/NarrativeBlock.tsx`

- [ ] **Step 1: Implement AbilityAllocator**

```tsx
// src/components/wizard/AbilityAllocator.tsx
interface AbilityAllocatorProps {
  config: {
    methods_ref?: string;        // reference to srd:mechanic:ability-scores#generation_methods
    show_racial_bonuses?: boolean;
  };
  initialData?: Record<string, number>;
  disabled: boolean;
}

export function AbilityAllocator({ config, initialData, disabled }: AbilityAllocatorProps) {
  // Load generation methods from config.methods_ref via IPC
  const methods = useGenerationMethods(config.methods_ref);
  const [selectedMethod, setSelectedMethod] = useState(initialData?.method || methods[0]?.id);
  const [scores, setScores] = useState<Record<string, number>>(initialData?.scores || {});

  const method = methods.find((m: { id: string }) => m.id === selectedMethod);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        {methods.map((m: { id: string; name: string }) => (
          <button
            key={m.id}
            onClick={() => setSelectedMethod(m.id)}
            disabled={disabled}
            className={`px-4 py-2 rounded border transition-colors ${
              selectedMethod === m.id
                ? "border-blue-500 bg-blue-900/30 text-white"
                : "border-gray-600 text-gray-400 hover:border-gray-500"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {method?.id === "point-buy" && (
        <PointBuyGrid scores={scores} onChange={setScores} disabled={disabled} />
      )}
      {method?.id === "4d6-drop-lowest" && (
        <RollingInterface scores={scores} onChange={setScores} disabled={disabled} />
      )}
      {method?.id === "standard-array" && (
        <StandardArrayGrid scores={scores} onChange={setScores} disabled={disabled} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement remaining step components**

`EntitySelector` — renders a card grid filtered by `entity_type`, handles selection.

`SkillAllocator` — reads skills from `config.skills_ref`, renders skill list with rank inputs, respects max ranks formula from mechanic entity.

`TextForm` — renders configurable text inputs for `config.fields`.

`EquipmentAllocator` — reads starting equipment from `config.starting_gold_ref`.

`NarrativeBlock` — renders static text with optional `config.text` field.

- [ ] **Step 3: Write tests**

Each component needs at least a smoke test — renders without crashing with valid config, shows appropriate empty/loading states.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/components/wizard/
git commit -m "feat: add wizard step components — ability-allocator, entity-selector, skill-allocator, text-form, equipment-allocator, narrative-block"
```

---

### Task 3: Character creation workflow entity

**Files:**
- Create: `content/packs/srd-3.5e/workflows/character-creation.mdx`

- [ ] **Step 1: Write the character creation workflow**

```yaml
---
id: "srd:workflow:character-creation"
entity_type: "workflow"
properties:
  name: "Character Creation"
  completion_creates: "creature.player_character"

  steps:
    - id: "ability-generation"
      name: "Generate Ability Scores"
      component: "ability-allocator"
      config:
        methods_ref: "srd:mechanic:ability-scores#generation_methods"
      required: true

    - id: "select-race"
      name: "Choose Race"
      component: "entity-selector"
      config:
        entity_type: "template.race"
        display: "card-grid"
      required: true
      depends_on: ["ability-generation"]

    - id: "select-class"
      name: "Choose Class"
      component: "entity-selector"
      config:
        entity_type: "template.class"
        display: "card-grid"
      required: true
      depends_on: ["select-race"]

    - id: "assign-abilities"
      name: "Assign Ability Scores"
      component: "ability-allocator"
      config:
        abilities_ref: "srd:mechanic:ability-scores#abilities"
        show_racial_bonuses: true
      required: true
      depends_on: ["ability-generation", "select-race"]

    - id: "allocate-skills"
      name: "Allocate Skills"
      component: "skill-allocator"
      config:
        skills_ref: "srd:mechanic:skills"
      required: true
      depends_on: ["select-class", "assign-abilities"]

    - id: "select-feats"
      name: "Choose Feats"
      component: "entity-selector"
      config:
        entity_type: "rule.feat"
        filter_eligible: true
        display: "filterable-list"
      required: true
      repeatable: true
      depends_on: ["select-class"]

    - id: "equipment"
      name: "Starting Equipment"
      component: "equipment-allocator"
      config:
        starting_gold_ref: "srd:mechanic:starting-gold"
      required: false
      depends_on: ["select-class"]

    - id: "description"
      name: "Character Description"
      component: "text-form"
      config:
        fields: ["name", "alignment", "appearance", "background"]
      required: false
---
```

- [ ] **Step 2: Write level-up and rest workflows**

```yaml
# content/packs/srd-3.5e/workflows/level-up.mdx
---
id: "srd:workflow:level-up"
entity_type: "workflow"
properties:
  name: "Level Up"
  completion_creates: "creature.player_character"
  steps:
    - id: "increase-hp"
      name: "Increase Hit Points"
      component: "computed-field"
      config:
        path: "combat.max_hp"
        label: "New HP"
      required: true
    - id: "new-class-feature"
      name: "New Class Feature"
      component: "entity-selector"
      config:
        entity_type: "rule.class-feature"
        filter_eligible: true
      required: true
      depends_on: []
    - id: "ability-score-increase"
      name: "Ability Score Increase"
      component: "ability-allocator"
      config:
        methods_ref: "srd:mechanic:ability-scores#generation_methods"
        mode: "increase"
      required: false
      depends_on: []
---
```

```yaml
# content/packs/srd-3.5e/workflows/rest.mdx
---
id: "srd:workflow:rest"
entity_type: "workflow"
properties:
  name: "Rest"
  steps:
    - id: "recover-hp"
      name: "Recover Hit Points"
      component: "computed-field"
      config:
        path: "combat.hp"
        formula: "min(combat.hp + hit_dice * con_modifier, combat.max_hp)"
      required: false
    - id: "daily-spells"
      name: "Prepare Spells"
      component: "entity-selector"
      config:
        entity_type: "actionable.spell"
        display: "list"
      required: false
---
```

- [ ] **Step 3: Commit**

Run:
```bash
git add content/packs/srd-3.5e/workflows/
git commit -m "feat: add character creation, level-up, and rest workflow entities"
```

---

### Task 4: Wire workflow entities into creation wizard route

**Files:**
- Modify: `src/routes/CreationWizard.tsx`

- [ ] **Step 1: Load workflow entity instead of hardcoded steps**

Replace the hardcoded step rendering with:

```tsx
export function CreationWizard() {
  const workflow = useWorkflow("srd:workflow:character-creation");
  const [wizardState, setWizardState] = useState<WorkflowState>({
    currentStep: 0,
    completed: [],
    data: {},
  });

  if (!workflow) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-serif text-white mb-6">{workflow.properties.name}</h1>
      <WorkflowStepper
        workflow={workflow}
        state={wizardState}
        onNext={(stepData) => {
          setWizardState((prev) => ({
            currentStep: prev.currentStep + 1,
            completed: [...prev.completed, workflow.properties.steps[prev.currentStep].id],
            data: { ...prev.data, ...stepData },
          }));
        }}
        onBack={() => {
          setWizardState((prev) => ({
            ...prev,
            currentStep: Math.max(0, prev.currentStep - 1),
          }));
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run:
```bash
npx vitest run src/routes/CreationWizard.test.tsx
```

Expected: All tests pass.

- [ ] **Step 3: Verify wizard renders with workflow entity**

Run dev mode and verify the wizard steps match the workflow entity.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/routes/CreationWizard.tsx
git commit -m "refactor: wire creation wizard to workflow entity instead of hardcoded steps"
```

---

### Task 5: Phase 3 verification

- [ ] **Step 1: Run full test suite**

Run:
```bash
pnpm run test
cd src-tauri && cargo test
pnpm run test:e2e
```

Expected: All tests pass.

- [ ] **Step 2: End-to-end character creation**

Run through the full character creation wizard. Verify:
- All 8 steps render in correct order
- `depends_on` prevents advancing to locked steps
- Completed steps show as filled progress indicators
- Final step emits a `creature.player_character` entity

- [ ] **Step 3: Verify level-up workflow**

Trigger level-up workflow and verify it loads from the content entity.

- [ ] **Step 4: Tag Phase 3 complete**

Run:
```bash
git tag phase-3-complete
```
