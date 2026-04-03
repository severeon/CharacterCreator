import type { Layout } from '../lib/types'

// Hardcoded layout for D&D 3.5e character sheet.
// Future: loaded from content pack entity via IPC (srd:layout:character-sheet).
const CHARACTER_SHEET_LAYOUT: Layout = {
  id: 'srd:layout:character-sheet',
  sections: [
    {
      id: 'identity',
      component: 'block',
      title: 'Identity',
      children: [
        { id: 'name', component: 'text-field', path: 'name', label: 'Name' },
        { id: 'race', component: 'computed-field', path: 'race_name', label: 'Race' },
        { id: 'class', component: 'computed-field', path: 'class_name', label: 'Class' },
        { id: 'alignment', component: 'computed-field', path: 'alignment', label: 'Alignment' },
        { id: 'deity', component: 'computed-field', path: 'deity', label: 'Deity' },
      ],
    },
    {
      id: 'abilities',
      component: 'block',
      title: 'Ability Scores',
      children: [
        { id: 'str', component: 'computed-field', path: 'abilities.strength.score', label: 'STR' },
        { id: 'dex', component: 'computed-field', path: 'abilities.dexterity.score', label: 'DEX' },
        { id: 'con', component: 'computed-field', path: 'abilities.constitution.score', label: 'CON' },
        { id: 'int', component: 'computed-field', path: 'abilities.intelligence.score', label: 'INT' },
        { id: 'wis', component: 'computed-field', path: 'abilities.wisdom.score', label: 'WIS' },
        { id: 'cha', component: 'computed-field', path: 'abilities.charisma.score', label: 'CHA' },
      ],
    },
    {
      id: 'skills',
      component: 'block',
      title: 'Skills',
      children: [
        {
          id: 'skill-list',
          component: 'list',
          source_path: 'skills_allocated',
          item_view_mode: 'table-row',
        },
      ],
    },
    {
      id: 'feats',
      component: 'block',
      title: 'Feats',
      children: [
        {
          id: 'feat-list',
          component: 'list',
          source_path: 'feats_selected',
          item_view_mode: 'card',
        },
      ],
    },
    {
      id: 'background',
      component: 'block',
      title: 'Background',
      children: [
        { id: 'appearance', component: 'text-field', path: 'appearance', label: 'Appearance' },
        { id: 'backstory', component: 'text-field', path: 'background', label: 'Background' },
      ],
    },
  ],
}

export function useLayout(layoutId: string): Layout | null {
  if (layoutId === 'srd:layout:character-sheet') return CHARACTER_SHEET_LAYOUT
  return null
}
