import React, { useState, useEffect } from 'react'
import type { Entity } from '../../lib/types'
import { babTable } from '../reference/babTable'
import { POINT_BUY_COST, POINT_BUY_BUDGET } from '../../lib/dnd35/constants'
import { IncrDecrControl } from '../primitives/IncrDecrControl'

interface AssignAbilitiesStepProps {
  abilities: Record<string, number>
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  pointBuyRemaining: number
  selectedClass: Entity | null
  unlocked?: boolean
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
  onAbilityPointBuy: (ability: string, delta: number) => void
  onAbilityManualChange: (ability: string, value: number) => void
}

const ABILITY_ORDER = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
const ABILITY_SHORT: Record<string, string> = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON',
  intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
}

const STANDARD_ARRAY_VALUES = [15, 14, 13, 12, 10, 8]

// Default max rerolls — TODO: wire to DM settings (DMSettings.max_rerolls)
const DEFAULT_MAX_REROLLS = 3

function roll4d6(): number[] {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
}

function dropLowestTotal(dice: number[]): number {
  return [...dice].sort((a, b) => a - b).slice(1).reduce((s, v) => s + v, 0)
}

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
      className={`dnd-method-btn${active ? ' dnd-method-btn--active' : ''}`}
    >
      {children}
    </button>
  )
}

/** Build an assignment map: ability → value|null, seeded from current abilities */
function buildAssignment(abilities: Record<string, number>, pool: number[]): Record<string, number | null> {
  const remaining = [...pool]
  const result: Record<string, number | null> = {}
  for (const ab of ABILITY_ORDER) {
    const v = abilities[ab]
    const idx = remaining.indexOf(v)
    if (idx !== -1) {
      result[ab] = v
      remaining.splice(idx, 1)
    } else {
      result[ab] = null
    }
  }
  return result
}

export function AssignAbilitiesStep({
  abilities,
  abilityMethod,
  pointBuyRemaining,
  selectedClass,
  unlocked = false,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
  onAbilityPointBuy,
  onAbilityManualChange,
}: AssignAbilitiesStepProps) {

  // ── Roll mode state ──────────────────────────────────────────────────────
  // pending.dice === null means the value came from a swap (no dice breakdown to show)
  type Pending = { dice: number[]; total: number } | { dice: null; total: number }
  const [pending, setPending] = useState<Pending | null>(null)
  const [rerollsUsed, setRerollsUsed] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  function freshRoll(): Pending {
    const dice = roll4d6()
    return { dice, total: dropLowestTotal(dice) }
  }

  // Initialise a fresh roll whenever we enter roll mode
  useEffect(() => {
    if (abilityMethod === 'roll') {
      setPending(freshRoll())
      setRerollsUsed(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abilityMethod])

  // After a normal assignment (pending → null), auto-roll next if stats remain
  useEffect(() => {
    if (abilityMethod !== 'roll' || pending !== null) return
    const anyUnassigned = ABILITY_ORDER.some(ab => !(abilities[ab] > 0))
    if (anyUnassigned) {
      const t = setTimeout(() => setPending(freshRoll()), 250)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [abilityMethod, pending, abilities])

  const pendingTotal = pending?.total ?? null
  const pendingDiceSorted = pending?.dice ? [...pending.dice].sort((a, b) => b - a) : null
  const rerollsRemaining = DEFAULT_MAX_REROLLS - rerollsUsed
  const allRollsAssigned = ABILITY_ORDER.every(ab => abilities[ab] > 0)

  function handleAssignStat(ability: string) {
    if (pending === null) return
    const existingValue = abilities[ability]

    // Place the pending value into this stat
    onAbilityManualChange(ability, pending.total)

    if (existingValue > 0) {
      // Stat was already filled — swap: old value becomes the new pending (no dice)
      setPending({ dice: null, total: existingValue })
    } else {
      // Empty slot — clear pending; auto-roll fires via useEffect if stats remain
      setPending(null)
    }
  }

  function handleReroll() {
    if (rerollsRemaining <= 0) return
    // Discards whatever is currently pending (roll or swapped value) and generates fresh dice
    setRerollsUsed(r => r + 1)
    setPending(freshRoll())
  }

  // ── Array mode drag-drop state ───────────────────────────────────────────
  const [draggedValue, setDraggedValue] = useState<number | null>(null)
  const [touchSelected, setTouchSelected] = useState<number | null>(null)
  const poolSource: number[] = abilityMethod === 'array' ? STANDARD_ARRAY_VALUES : []

  const [assignment, setAssignment] = useState<Record<string, number | null>>(() =>
    buildAssignment(abilities, poolSource)
  )

  useEffect(() => {
    if (abilityMethod !== 'array') return
    setAssignment(buildAssignment(abilities, STANDARD_ARRAY_VALUES))
    setDraggedValue(null)
    setTouchSelected(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [abilityMethod])

  const assignedValues = Object.values(assignment).filter((v) => v !== null) as number[]
  const poolRemaining = poolSource.filter((v, i) => {
    const alreadyClaimed = assignedValues.filter((a) => a === v).length
    const appearsBeforeThis = poolSource.slice(0, i).filter((p) => p === v).length
    return appearsBeforeThis >= alreadyClaimed
  })

  function handleArrayDrop(ability: string) {
    if (draggedValue === null) return
    setAssignment((cur) => ({ ...cur, [ability]: draggedValue }))
    onAbilityManualChange(ability, draggedValue)
    setDraggedValue(null)
  }

  function handleArraySlotTap(ability: string) {
    if (touchSelected === null) return
    setAssignment((cur) => ({ ...cur, [ability]: touchSelected }))
    onAbilityManualChange(ability, touchSelected)
    setTouchSelected(null)
  }

  // ── Derived stats ────────────────────────────────────────────────────────
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

  const statValueStyle = (positive: boolean): React.CSSProperties => ({
    display: 'block', fontSize: '1.4rem', fontWeight: 700,
    fontFamily: 'Cinzel, serif', color: positive ? '#6b2737' : '#8B1010',
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

      {/* ── ROLL MODE ─────────────────────────────────────────────────────── */}
      {abilityMethod === 'roll' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

          {/* Reroll charge tokens */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)', opacity: 0.6 }}>
              Rerolls
            </span>
            {Array.from({ length: DEFAULT_MAX_REROLLS }).map((_, i) => {
              const spent = i < rerollsUsed
              return (
                <div key={i} style={{
                  width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700,
                  background: spent ? '#6b2737' : 'var(--parchment-light)',
                  border: '1px solid var(--gold-rule)',
                  color: spent ? 'var(--parchment)' : '#6b2737',
                  opacity: spent ? 0.5 : 1,
                }}>
                  {i + 1}
                </div>
              )
            })}
          </div>

          {/* Die roll card — draggable big number */}
          {pendingTotal !== null ? (
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(pendingTotal))
                setIsDragging(true)
              }}
              onDragEnd={() => setIsDragging(false)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
                padding: '1.25rem 2rem',
                background: 'var(--parchment-light)',
                border: `2px solid ${pendingDiceSorted ? '#6b2737' : 'var(--gold-rule)'}`,
                cursor: 'grab',
                userSelect: 'none',
                opacity: isDragging ? 0.6 : 1,
                minWidth: 140,
              }}
            >
              {/* 4 dice — only shown for fresh rolls (not swapped values) */}
              {pendingDiceSorted !== null && (
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {pendingDiceSorted.map((face, di) => {
                    const isDropped = di === 3
                    return (
                      <div key={di} style={{
                        width: 28, height: 28,
                        background: isDropped ? 'var(--parchment-dark)' : 'var(--parchment)',
                        border: `1px solid ${isDropped ? 'var(--gold-rule)' : 'var(--gold)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Cinzel, serif', fontSize: '0.8rem',
                        color: isDropped ? 'var(--ink)' : '#6b2737',
                        fontWeight: isDropped ? 400 : 700,
                        opacity: isDropped ? 0.3 : 1,
                        textDecoration: isDropped ? 'line-through' : undefined,
                      }}>
                        {face}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Big draggable total */}
              <span style={{
                fontFamily: 'Cinzel, serif', fontSize: '4rem', fontWeight: 700,
                color: '#6b2737', lineHeight: 1,
              }}>
                {pendingTotal}
              </span>

              <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.68rem', color: 'var(--ink)', opacity: 0.55, fontStyle: 'italic' }}>
                {pendingDiceSorted !== null
                  ? 'drag or tap a stat to assign'
                  : 'swapped — assign elsewhere or reroll to discard'}
              </span>
            </div>
          ) : (
            /* Between assignments — brief gap while next roll generates */
            !allRollsAssigned && (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'var(--ink)', opacity: 0.4, letterSpacing: '0.06em' }}>Rolling…</span>
              </div>
            )
          )}

          {/* Reroll button */}
          <button
            type="button"
            onClick={handleReroll}
            disabled={rerollsRemaining <= 0}
            style={{
              background: rerollsRemaining > 0 ? '#6b2737' : 'transparent',
              border: '1px solid var(--gold-rule)',
              color: rerollsRemaining > 0 ? 'var(--parchment)' : 'var(--ink)',
              fontFamily: 'Cinzel, serif', fontSize: '0.7rem', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              padding: '7px 16px',
              cursor: rerollsRemaining > 0 ? 'pointer' : 'default',
              opacity: rerollsRemaining > 0 ? 1 : 0.35,
            }}
          >
            Reroll — {rerollsRemaining} of {DEFAULT_MAX_REROLLS} left
          </button>

          {/* Completion hint when all assigned but rerolls remain */}
          {allRollsAssigned && rerollsRemaining > 0 && (
            <div className="dnd-info-box" style={{ textAlign: 'center', maxWidth: 360 }}>
              {rerollsRemaining === 1 ? '1 reroll remaining' : `${rerollsRemaining} rerolls remaining`} — use {rerollsRemaining === 1 ? 'it' : 'them'} to try for higher scores. Drag the result onto any assigned stat to replace it.
            </div>
          )}

          {/* 6 stat boxes — drop targets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.35rem', width: '100%' }}>
            {ABILITY_ORDER.map((ability) => {
              const value = abilities[ability]
              const isAssigned = value > 0
              const isTarget = pendingTotal !== null
              return (
                <div
                  key={ability}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleAssignStat(ability)}
                  onClick={() => isTarget && handleAssignStat(ability)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                    padding: '0.6rem 0.25rem',
                    background: isTarget && !isAssigned ? 'var(--parchment-dark)' : 'var(--parchment-light)',
                    border: `1px solid var(--gold-rule)`,
                    borderTop: isAssigned ? '2px solid #6b2737' : isTarget ? '2px dashed #6b2737' : '1px solid var(--gold-rule)',
                    cursor: isTarget ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: isAssigned ? '1.4rem' : '1.6rem',
                    fontWeight: 700,
                    color: isAssigned ? '#6b2737' : 'var(--ink)',
                    opacity: isAssigned ? 1 : 0.2,
                    lineHeight: 1,
                  }}>
                    {isAssigned ? value : '?'}
                  </span>
                  {isAssigned && (
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: 'var(--ink)', opacity: 0.55, fontStyle: 'italic' }}>
                      {formatMod(abilityModifier(value))}
                    </span>
                  )}
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: 'var(--ink)', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {ABILITY_SHORT[ability]}
                  </span>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* ── STANDARD ARRAY MODE ───────────────────────────────────────────── */}
      {abilityMethod === 'array' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
            Drag a value onto an ability slot, or tap to select then tap a slot.
          </p>
          <PoolAssignment
            poolSource={STANDARD_ARRAY_VALUES}
            poolRemaining={poolRemaining}
            assignment={assignment}
            draggedValue={draggedValue}
            touchSelected={touchSelected}
            onDragStart={setDraggedValue}
            onDragEnd={() => setDraggedValue(null)}
            onTouchSelect={(v) => setTouchSelected(touchSelected === v ? null : v)}
            onDrop={handleArrayDrop}
            onSlotTap={handleArraySlotTap}
          />
        </div>
      )}

      {/* ── POINT BUY MODE ────────────────────────────────────────────────── */}
      {abilityMethod === 'pointbuy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 700,
            color: pointBuyRemaining < 0 ? '#8B1010' : '#6b2737', textAlign: 'center',
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
                const canDec = value > (unlocked ? 3 : 8)
                const canInc = unlocked ? value < 30 : (value < 18 && pointBuyRemaining > 0)
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
                        <button onClick={() => onAbilityPointBuy(ability, -1)} disabled={!canDec}
                          style={{ width: 24, height: 24, border: '1px solid var(--gold-rule)', background: 'var(--parchment-light)', color: '#6b2737', fontFamily: 'Cinzel, serif', fontSize: '0.85rem', cursor: canDec ? 'pointer' : 'default', opacity: canDec ? 1 : 0.3, padding: 0, lineHeight: 1 }}>
                          −
                        </button>
                        <button onClick={() => onAbilityPointBuy(ability, 1)} disabled={!canInc}
                          style={{ width: 24, height: 24, border: '1px solid var(--gold-rule)', background: 'var(--parchment-light)', color: '#6b2737', fontFamily: 'Cinzel, serif', fontSize: '0.85rem', cursor: canInc ? 'pointer' : 'default', opacity: canInc ? 1 : 0.3, padding: 0, lineHeight: 1 }}>
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MANUAL MODE ───────────────────────────────────────────────────── */}
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
                  max={unlocked ? 30 : 20}
                  onChange={(v) => onAbilityManualChange(ability, v)}
                  sublabel={formatMod(mod)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* ── DERIVED STATS PANEL ───────────────────────────────────────────── */}
      <div>
        <div className="dnd-section-header">Derived Statistics (Preview)</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem',
          padding: '10px', background: 'var(--parchment-dark)',
          border: '1px solid var(--gold-rule)', borderTop: 'none',
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
            <div key={label} className="dnd-stat-box" style={{ borderTopWidth: '2px' }}>
              <span className="dnd-stat-box-label" style={{ color: 'var(--ink)' }}>{label}</span>
              <span style={statValueStyle(positive)}>{value}</span>
              {sub && <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--ink)', opacity: 0.7, marginTop: '1px' }}>{sub}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Shared pool assignment widget (standard array) ──────────────────────────

interface PoolAssignmentProps {
  poolSource: number[]
  poolRemaining: number[]
  assignment: Record<string, number | null>
  draggedValue: number | null
  touchSelected: number | null
  onDragStart: (v: number) => void
  onDragEnd: () => void
  onTouchSelect: (v: number) => void
  onDrop: (ability: string) => void
  onSlotTap: (ability: string) => void
}

function PoolAssignment({
  poolRemaining,
  assignment,
  draggedValue,
  touchSelected,
  onDragStart,
  onDragEnd,
  onTouchSelect,
  onDrop,
  onSlotTap,
}: PoolAssignmentProps) {
  return (
    <>
      <div style={{
        display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: 40,
        padding: '6px 8px', background: 'var(--parchment-dark)', border: '1px solid var(--gold-rule)',
      }}>
        {poolRemaining.length === 0 && (
          <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--ink)', opacity: 0.6 }}>
            All values assigned
          </span>
        )}
        {poolRemaining.map((v, i) => (
          <div
            key={`${v}-${i}`}
            draggable
            onDragStart={() => onDragStart(v)}
            onDragEnd={onDragEnd}
            onClick={() => onTouchSelect(v)}
            style={{
              background: touchSelected === v ? '#4a1a25' : '#6b2737',
              color: 'var(--parchment)',
              fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 700,
              padding: '4px 14px',
              border: touchSelected === v ? '2px solid var(--gold)' : '1px solid #4a1a25',
              cursor: 'grab', userSelect: 'none',
            }}
          >
            {v}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {ABILITY_ORDER.map((ability) => {
          const assigned = assignment[ability]
          const mod = assigned !== null ? abilityModifier(assigned) : null
          const isTarget = touchSelected !== null || draggedValue !== null
          return (
            <div
              key={ability}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(ability)}
              onClick={() => isTarget && onSlotTap(ability)}
              className="dnd-stat-box"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', borderTopWidth: '2px',
                border: assigned !== null ? undefined : '1px dashed var(--gold)',
                borderTop: assigned !== null ? undefined : '2px dashed #6b2737',
                cursor: isTarget ? 'pointer' : 'default',
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
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'var(--ink)', opacity: 0.4, fontStyle: 'italic' }}>
                  {isTarget ? 'Place here' : 'Empty'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
