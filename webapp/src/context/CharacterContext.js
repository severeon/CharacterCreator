'use client'

import { createContext, useContext, useReducer, createElement } from 'react'

// ─── Initial State ─────────────────────────────────────────────────────────

export const INITIAL_CHARACTER_STATE = {
  charName: '',
  playerName: '',
  alignment: '',
  deity: '',
  race: 'Human',
  templates: [],
  scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  lvlBonuses: {},
  classAbilBoosts: {},
  classLevels: 1,
  rhdChoices: [],
  levelChoices: [{ classA: null, classB: null }],
  skillRanks: {},
  featsByLevel: {},
  heightFt: '',
  heightIn: '',
  weightLbs: '',
  age: '',
  eyes: '',
  hair: '',
  skin: '',
  description: '',
  background: '',
  classStyleChoices: {},
  spellsKnown: {},
  spellsPrepared: {},
  powersKnown: {},
  invocations: [],
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function syncLevelChoices(state) {
  const target = state.classLevels
  const current = state.levelChoices
  if (current.length === target) return current
  if (current.length < target) {
    return [
      ...current,
      ...Array.from({ length: target - current.length }, () => ({ classA: null, classB: null })),
    ]
  }
  return current.slice(0, target)
}

// ─── Reducer ───────────────────────────────────────────────────────────────

export function characterReducer(state, action) {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, [action.payload.field]: action.payload.value }
    case 'SET_ALIGNMENT':
      return { ...state, alignment: action.payload }
    case 'SET_RACE':
      return { ...state, race: action.payload }
    case 'SET_SCORE':
      return { ...state, scores: { ...state.scores, [action.payload.stat]: action.payload.value } }
    case 'SET_PHYSICAL':
      return { ...state, [action.payload.field]: action.payload.value }
    case 'SET_SKILL_RANK':
      return { ...state, skillRanks: { ...state.skillRanks, [action.payload.skill]: action.payload.ranks } }
    case 'ADD_FEAT':
      return { ...state, featsByLevel: { ...state.featsByLevel, [action.payload.slotId]: action.payload.featName } }
    case 'REMOVE_FEAT':
      return { ...state, featsByLevel: { ...state.featsByLevel, [action.payload.slotId]: undefined } }
    case 'ADD_LEVEL': {
      const updated = { ...state, classLevels: Math.min(20, state.classLevels + 1) }
      return { ...updated, levelChoices: syncLevelChoices(updated) }
    }
    case 'REMOVE_LEVEL': {
      const min = state.rhdChoices.length > 0 ? 0 : 1
      const updated = { ...state, classLevels: Math.max(min, state.classLevels - 1) }
      return { ...updated, levelChoices: syncLevelChoices(updated) }
    }
    default:
      return state
  }
}

// ─── Context + Provider ────────────────────────────────────────────────────

const CharacterContext = createContext(null)

export function CharacterProvider({ children }) {
  const [state, dispatch] = useReducer(characterReducer, INITIAL_CHARACTER_STATE)
  return createElement(CharacterContext.Provider, { value: { state, dispatch } }, children)
}

export function useCharacter() {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within CharacterProvider')
  return ctx
}
