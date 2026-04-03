import type { ViewMode } from '../lib/types'

// Default view modes per entity type — in future these will be loaded from content pack entities via IPC
const DEFAULT_VIEW_MODES: Record<string, Record<string, ViewMode>> = {
  race: {
    card: {
      id: 'default:view:race-card',
      template: 'card',
      slots: {
        title: { path: 'name' },
        subtitle: { path: 'size', label: 'Size' },
        short_desc: { path: 'description' },
      },
    },
    reference: {
      id: 'default:view:race-reference',
      template: 'reference',
      slots: {
        subtitle: { path: 'size', label: 'Size' },
      },
    },
  },
  class: {
    card: {
      id: 'default:view:class-card',
      template: 'card',
      slots: {
        title: { path: 'name' },
        subtitle: { path: 'hit_die', label: 'HD' },
        badge: { path: 'alignment_restriction', label: 'Alignment' },
      },
    },
    reference: {
      id: 'default:view:class-reference',
      template: 'reference',
      slots: {
        subtitle: { path: 'hit_die', label: 'Hit Die' },
      },
    },
  },
  feat: {
    card: {
      id: 'default:view:feat-card',
      template: 'card',
      slots: {
        title: { path: 'name' },
        subtitle: { path: 'type', label: 'Type' },
        short_desc: { path: 'benefit' },
      },
    },
    reference: {
      id: 'default:view:feat-reference',
      template: 'reference',
      slots: {
        subtitle: { path: 'type', label: 'Type' },
        body: { path: 'benefit' },
      },
    },
  },
  spell: {
    card: {
      id: 'default:view:spell-card',
      template: 'card',
      slots: {
        title: { path: 'name' },
        subtitle: { path: 'school', label: 'School' },
        badge: { path: 'spell_level', label: 'Level' },
        short_desc: { path: 'short_description' },
      },
    },
    reference: {
      id: 'default:view:spell-reference',
      template: 'reference',
      slots: {
        subtitle: { path: 'school', label: 'School' },
        body: { path: 'description' },
      },
    },
  },
  skill: {
    card: {
      id: 'default:view:skill-card',
      template: 'card',
      slots: {
        title: { path: 'name' },
        subtitle: { path: 'ability', label: 'Ability' },
      },
    },
    'table-row': {
      id: 'default:view:skill-table-row',
      template: 'table-row',
      slots: {
        title: { path: 'name' },
        subtitle: { path: 'ability', label: 'Key Ability' },
      },
    },
    reference: {
      id: 'default:view:skill-reference',
      template: 'reference',
      slots: {
        subtitle: { path: 'ability', label: 'Ability' },
        body: { path: 'description' },
      },
    },
  },
}

const FALLBACK_VIEW_MODE: ViewMode = {
  id: 'default:view:fallback',
  template: 'card',
  slots: {
    title: { path: 'name' },
  },
}

export function useViewMode(entityType: string, template: string = 'card'): ViewMode {
  return DEFAULT_VIEW_MODES[entityType]?.[template] ?? FALLBACK_VIEW_MODE
}
