'use client'

import { createContext, useContext, useReducer, createElement } from 'react'

const ALLOWED_CAMPAIGN_KEYS = [
  'abMethod', 'pbPoints', 'enforceMaxBase', 'gestaltEnabled', 'allowTemplates',
  'allowHighLA', 'allowRacialHD', 'maxECL', 'notes', 'enforcePrereqs', 'enforcePrCPrereqs',
  'disabledRaces', 'disabledClasses', 'disabledFeats', 'disabledTemplates', 'disabledSpells', 'disabledPowers',
]

export const INITIAL_DM_STATE = {
  abMethod: 'manual',
  pbPoints: 25,
  enforceMaxBase: true,
  gestaltEnabled: true,
  allowTemplates: true,
  allowHighLA: true,
  allowRacialHD: true,
  maxECL: 40,
  notes: '',
  dmPassword: '',
  enforcePrereqs: true,
  enforcePrCPrereqs: true,
  disabledRaces: [],
  disabledClasses: [],
  disabledFeats: [],
  disabledTemplates: [],
  disabledSpells: [],
  disabledPowers: [],
}

export function dmReducer(state, action) {
  switch (action.type) {
    case 'SET_AB_METHOD':
      return { ...state, abMethod: action.payload }
    case 'SET_PB_POINTS':
      return { ...state, pbPoints: action.payload }
    case 'SET_LOCKED':
      return { ...state, dmPassword: action.payload.password ?? '' }
    case 'TOGGLE_CONTENT': {
      const { list, item } = action.payload
      const cur = state[list]
      return { ...state, [list]: cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item] }
    }
    case 'SET_CAMPAIGN': {
      const filtered = Object.fromEntries(
        Object.entries(action.payload).filter(([k]) => ALLOWED_CAMPAIGN_KEYS.includes(k))
      )
      return { ...state, ...filtered }
    }
    default:
      return state
  }
}

const DmContext = createContext(null)

export function DmProvider({ children }) {
  const [state, dispatch] = useReducer(dmReducer, INITIAL_DM_STATE)
  return createElement(DmContext.Provider, { value: { state, dispatch } }, children)
}

export function useDm() {
  const ctx = useContext(DmContext)
  if (!ctx) throw new Error('useDm must be used within DmProvider')
  return ctx
}
