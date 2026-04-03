import React, { useState } from 'react'
import type { Entity } from '../../lib/types'
import { babTable } from '../reference/babTable'
import { POINT_BUY_COST, POINT_BUY_BUDGET } from '../../lib/dnd35/constants'
import { IncrDecrControl } from '../primitives/IncrDecrControl'

interface AssignAbilitiesStepProps {
  abilities: Record<string, number>
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  pointBuyRemaining: number
  selectedClass: Entity | null
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
  onAbilityPointBuy: (ability: string, delta: number) => void
  onAbilityManualChange: (ability: string, value: number) => void
  onAssignAbilities: () => void
  onBack: () => void
}

const ABILITY_ORDER = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
const ABILITY_SHORT: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

const STANDARD_ARRAY_VALUES = [15, 14, 13, 12, 10, 8]

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function MethodButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? 'var(--burgundy)' : 'var(--parchment-light)',
        border: `1px solid ${active ? '#6b2737' : 'var(--gold-rule)'}`,
        fontFamily: 'Cinzel, serif',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase' as const,
        color: active ? 'var(--parchment)' : 'var(--burgundy)',
        padding: '7px 14px',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export function AssignAbilitiesStep({
  abilities,
  abilityMethod,
  pointBuyRemaining,
  selectedClass,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
  onAbilityPointBuy,
  onAbilityManualChange,
}: AssignAbilitiesStepProps) {
  // Drag-and-drop state for array mode
  const [draggedValue, setDraggedValue] = useState<number | null>(null)
  const [touchSelected, setTouchSelected] = useState<number | null>(null)
  // Internal assignment map for array mode: ability -> value | null
  const [arrayAssignment, setArrayAssignment] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {}
    for (const ab of ABILITY_ORDER) {
      const v = abilities[ab]
      init[ab] = STANDARD_ARRAY_VALUES.includes(v) ? v : null
    }
    return init
  })

  // Derived: which standard array values are still in the pool
  const assignedValues = Object.values(arrayAssignment).filter((v) => v !== null) as number[]
  const poolValues = STANDARD_ARRAY_VALUES.filter(
    (v) => assignedValues.filter((a) => a === v).length < STANDARD_ARRAY_VALUES.filter((sv) => sv === v).length
  )

  function handleArrayDrop(ability: string) {
    if (draggedValue === null) return
    const prev = arrayAssignment[ability]
    setArrayAssignment((cur) => ({ ...cur, [ability]: draggedValue }))
    // Sync with parent via onAbilityManualChange
    onAbilityManualChange(ability, draggedValue)
    if (prev !== null) {
      // The old value goes back to pool automatically (it's no longer in assignment)
    }
    setDraggedValue(null)
  }

  function handleTouchSlotTap(ability: string) {
    if (touchSelected === null) return
    const prev = arrayAssignment[ability]
    setArrayAssignment((cur) => ({ ...cur, [ability]: touchSelected }))
    onAbilityManualChange(ability, touchSelected)
    if (prev !== null) {
      // old value returns to pool implicitly
    }
    setTouchSelected(null)
  }

  // Derived stats
  const conMod = abilityModifier(abilities.constitution || 10)
  const dexMod = abilityModifier(abilities.dexterity || 10)
  const wisMod = abilityModifier(abilities.wisdom || 10)
  const classData = selectedClass?.properties

  const hd = classData ? (classData['hd'] as number) ?? 8 : 8
  const bab = classData ? ((classData['bab'] as string) ?? 'medium') : 'medium'
  const fortBase = classData ? ((classData['fort'] as number) ?? 0) : 0
  const refBase = classData ? ((classData['ref'] as number) ?? 0) : 0
  const willBase = classData ? ((classData['will'] as number) ?? 0) : 0

  const babProgression = babTable[bab] || babTable['medium']
  const currentBAB = babProgression[0]

  const hp = hd + conMod
  const initiative = dexMod
  const ac = 10 + dexMod
  const flatFooted = 10
  const touch = 10 + dexMod

  const statBoxStyle: React.CSSProperties = {
    background: 'var(--parchment-light)',
    border: '1px solid var(--gold-rule)',
    borderTop: '2px solid #6b2737',
    padding: '8px 10px',
  }

  const statLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.6rem',
    fontFamily: 'Cinzel, serif',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--ink)',
    marginBottom: '2px',
  }

  const statValueStyle = (positive: boolean): React.CSSProperties => ({
    display: 'block',
    fontSize: '1.4rem',
    fontWeight: 700,
    fontFamily: 'Cinzel, serif',
    color: positive ? '#6b2737' : '#8B1010',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Method selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        <MethodButton active={abilityMethod === 'roll'} onClick={onRollAbilities}>Roll 4d6</MethodButton>
        <MethodButton active={abilityMethod === 'array'} onClick={onStandardArray}>Standard Array</MethodButton>
        <MethodButton active={abilityMethod === 'pointbuy'} onClick={onPointBuy}>Point Buy</MethodButton>
        <MethodButton active={abilityMethod === 'manual'} onClick={onManualEntry}>Manual Entry</MethodButton>
      </div>

      {/* ── ROLL MODE ── */}
      {abilityMethod === 'roll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
            Assign your rolled scores to each ability.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {ABILITY_ORDER.map((ability) => {
              const value = abilities[ability] ?? 10
              const mod = abilityModifier(value)
              return (
                <div key={ability} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '8px 10px',
                  background: 'var(--parchment-light)',
                  border: '1px solid var(--gold-rule)',
                  borderTop: '2px solid #6b2737',
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--ink)' }}>
                      {ability}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.6rem', fontFamily: 'Cinzel, serif', color: 'var(--ink)', opacity: 0.6 }}>
                      {ABILITY_SHORT[ability]}
                    </span>
                  </div>
                  <IncrDecrControl
                    value={value}
                    min={3}
                    max={20}
                    onChange={(v) => onAbilityManualChange(ability, v)}
                    sublabel={formatMod(mod)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ARRAY MODE ── */}
      {abilityMethod === 'array' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
            Drag a value chip onto an ability slot, or tap to select then tap a slot.
          </p>

          {/* Pool of unassigned chips */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: 36, padding: '6px', background: 'var(--parchment-dark)', border: '1px solid var(--gold-rule)' }}>
            {poolValues.length === 0 && (
              <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--ink)', opacity: 0.6 }}>All values assigned</span>
            )}
            {poolValues.map((v, i) => (
              <div
                key={`${v}-${i}`}
                draggable
                onDragStart={() => setDraggedValue(v)}
                onDragEnd={() => setDraggedValue(null)}
                onClick={() => setTouchSelected(touchSelected === v ? null : v)}
                style={{
                  background: '#6b2737',
                  color: 'var(--parchment)',
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  padding: '4px 14px',
                  border: touchSelected === v ? '2px solid var(--gold)' : '1px solid #4a1a25',
                  cursor: 'grab',
                  userSelect: 'none',
                  outline: touchSelected === v ? '2px solid var(--gold)' : undefined,
                }}
              >
                {v}
              </div>
            ))}
          </div>

          {/* Ability drop zones */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {ABILITY_ORDER.map((ability) => {
              const assigned = arrayAssignment[ability]
              const mod = assigned !== null ? abilityModifier(assigned) : null
              return (
                <div
                  key={ability}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleArrayDrop(ability)}
                  onClick={() => touchSelected !== null && handleTouchSlotTap(ability)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '8px 10px',
                    background: 'var(--parchment-light)',
                    border: assigned !== null ? '1px solid var(--gold-rule)' : '1px dashed var(--gold)',
                    borderTop: assigned !== null ? '2px solid #6b2737' : '2px dashed #6b2737',
                    cursor: touchSelected !== null ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--ink)' }}>
                      {ability}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.6rem', fontFamily: 'Cinzel, serif', color: 'var(--ink)', opacity: 0.6 }}>
                      {ABILITY_SHORT[ability]}
                    </span>
                  </div>
                  {assigned !== null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', fontWeight: 700, color: '#6b2737' }}>{assigned}</span>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'var(--ink)', fontStyle: 'italic' }}>{mod !== null ? formatMod(mod) : ''}</span>
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'var(--ink)', opacity: 0.4, fontStyle: 'italic' }}>Drop here</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── POINT BUY MODE ── */}
      {abilityMethod === 'pointbuy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: pointBuyRemaining < 0 ? '#8B1010' : '#6b2737',
            textAlign: 'center',
          }}>
            Points Remaining: {pointBuyRemaining}
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 400, opacity: 0.7 }}>Budget: {POINT_BUY_BUDGET}</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Cinzel, serif', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#6b2737', color: 'var(--parchment)' }}>
                {['Ability', 'Score', 'Modifier', 'Cost', ''].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, letterSpacing: '0.06em', fontSize: '0.65rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ABILITY_ORDER.map((ability, idx) => {
                const value = abilities[ability] ?? 8
                const mod = abilityModifier(value)
                const cost = POINT_BUY_COST[value] ?? 0
                const canDecrement = value > 8
                const canIncrement = value < 18 && pointBuyRemaining > 0
                return (
                  <tr key={ability} style={{ background: idx % 2 === 0 ? 'var(--parchment-light)' : 'var(--parchment-dark)' }}>
                    <td style={{ padding: '6px 8px', textTransform: 'capitalize', fontWeight: 600 }}>
                      {ability} <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>({ABILITY_SHORT[ability]})</span>
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#6b2737' }}>{value}</td>
                    <td style={{ padding: '6px 8px', color: mod >= 0 ? '#6b2737' : '#8B1010', fontWeight: 600 }}>{formatMod(mod)}</td>
                    <td style={{ padding: '6px 8px', opacity: 0.8 }}>{cost}</td>
                    <td style={{ padding: '6px 4px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => onAbilityPointBuy(ability, -1)}
                          disabled={!canDecrement}
                          style={{
                            width: 24, height: 24,
                            border: '1px solid var(--gold-rule)',
                            background: 'var(--parchment-light)',
                            color: '#6b2737',
                            fontFamily: 'Cinzel, serif',
                            fontSize: '0.85rem',
                            cursor: canDecrement ? 'pointer' : 'default',
                            opacity: canDecrement ? 1 : 0.3,
                            padding: 0, lineHeight: 1,
                          }}
                        >−</button>
                        <button
                          onClick={() => onAbilityPointBuy(ability, 1)}
                          disabled={!canIncrement}
                          style={{
                            width: 24, height: 24,
                            border: '1px solid var(--gold-rule)',
                            background: 'var(--parchment-light)',
                            color: '#6b2737',
                            fontFamily: 'Cinzel, serif',
                            fontSize: '0.85rem',
                            cursor: canIncrement ? 'pointer' : 'default',
                            opacity: canIncrement ? 1 : 0.3,
                            padding: 0, lineHeight: 1,
                          }}
                        >+</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MANUAL MODE ── */}
      {abilityMethod === 'manual' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
          {ABILITY_ORDER.map((ability) => {
            const value = abilities[ability] ?? 10
            const mod = abilityModifier(value)
            return (
              <div key={ability} className="stat-block" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '10px 8px' }}>
                <div className="dnd-section-header" style={{ fontSize: '0.6rem', textAlign: 'center', marginBottom: 0 }}>
                  {ability}
                  <span style={{ display: 'block', fontSize: '0.55rem', opacity: 0.7 }}>{ABILITY_SHORT[ability]}</span>
                </div>
                <IncrDecrControl
                  value={value}
                  min={1}
                  max={20}
                  onChange={(v) => onAbilityManualChange(ability, v)}
                  sublabel={formatMod(mod)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* ── DERIVED STATS PANEL ── */}
      <div>
        <div className="dnd-section-header">Derived Statistics (Preview)</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.4rem',
          padding: '10px',
          background: 'var(--parchment-dark)',
          border: '1px solid var(--gold-rule)',
          borderTop: 'none',
        }}>
          {[
            { label: 'Hit Points', value: `${hp}`, sub: `HD: d${hd}`, positive: hp > 0 },
            { label: 'Base Attack', value: `+${currentBAB}`, positive: true },
            { label: 'Initiative', value: formatMod(initiative), positive: initiative >= 0 },
            { label: 'Armor Class', value: `${ac}`, sub: `Touch: ${touch} / FF: ${flatFooted}`, positive: true },
            { label: 'Fortitude', value: formatMod(fortBase + conMod), positive: fortBase + conMod >= 0 },
            { label: 'Reflex', value: formatMod(refBase + dexMod), positive: refBase + dexMod >= 0 },
            { label: 'Will', value: formatMod(willBase + wisMod), positive: willBase + wisMod >= 0 },
            { label: 'Speed', value: '30 ft', positive: true },
          ].map(({ label, value, sub, positive }) => (
            <div key={label} style={statBoxStyle}>
              <span style={statLabelStyle}>{label}</span>
              <span style={statValueStyle(positive)}>{value}</span>
              {sub && <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--ink)', opacity: 0.7, marginTop: '1px' }}>{sub}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
