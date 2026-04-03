import React, { useState, useEffect } from 'react'
import type { Entity } from '../../lib/types'
import { babTable } from '../reference/babTable'
import { POINT_BUY_COST, POINT_BUY_BUDGET } from '../../lib/dnd35/constants'
import { IncrDecrControl } from '../primitives/IncrDecrControl'

interface AssignAbilitiesStepProps {
  abilities: Record<string, number>
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  rolledSets: number[][]
  pointBuyRemaining: number
  selectedClass: Entity | null
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
  onAbilityPointBuy: (ability: string, delta: number) => void
  onAbilityManualChange: (ability: string, value: number) => void
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

const DICE_SPIN_CSS = `
@keyframes diceSpin {
  0%   { transform: rotateY(0deg) scale(1.15); }
  50%  { transform: rotateY(180deg) scale(0.9); }
  100% { transform: rotateY(360deg) scale(1); }
}
`

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

/** Compute rolled totals (drop lowest die) from a set of 6×4 dice */
function computeRolledTotals(sets: number[][]): number[] {
  return sets.map(set => {
    const sorted = [...set].sort((a, b) => a - b)
    return sorted.slice(1).reduce((s, v) => s + v, 0)
  })
}

/** Build an assignment map: ability → value|null, seeded from current abilities */
function buildAssignment(abilities: Record<string, number>, pool: number[]): Record<string, number | null> {
  // Track how many of each value have been "claimed" so duplicates are handled correctly
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
  rolledSets,
  pointBuyRemaining,
  selectedClass,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
  onAbilityPointBuy,
  onAbilityManualChange,
}: AssignAbilitiesStepProps) {
  const [draggedValue, setDraggedValue] = useState<number | null>(null)
  const [touchSelected, setTouchSelected] = useState<number | null>(null)
  const [rollingSet, setRollingSet] = useState<number | null>(null)
  // animFaces: random cycling faces shown during animation; null = not animating (show real values)
  const [animFaces, setAnimFaces] = useState<number[][] | null>(null)

  // While a set is animating, cycle random die faces for that set every 60ms
  useEffect(() => {
    if (rollingSet === null) return
    const interval = setInterval(() => {
      setAnimFaces(prev =>
        prev
          ? prev.map((set, i) =>
              i === rollingSet
                ? Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
                : set
            )
          : prev
      )
    }, 60)
    return () => clearInterval(interval)
  }, [rollingSet])

  // Pool source depends on method
  const rolledTotals = computeRolledTotals(rolledSets)
  const poolSource: number[] = abilityMethod === 'array' ? STANDARD_ARRAY_VALUES : rolledTotals

  // Assignment map: ability → value | null
  const [assignment, setAssignment] = useState<Record<string, number | null>>(() =>
    buildAssignment(abilities, poolSource)
  )

  // Reset assignment whenever method or rolled dice change
  useEffect(() => {
    const pool = abilityMethod === 'array'
      ? STANDARD_ARRAY_VALUES
      : computeRolledTotals(rolledSets)
    setAssignment(buildAssignment(abilities, pool))
    setDraggedValue(null)
    setTouchSelected(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [abilityMethod, rolledSets])

  // Unassigned pool chips
  const assignedValues = Object.values(assignment).filter((v) => v !== null) as number[]
  const poolRemaining = poolSource.filter((v, i) => {
    const alreadyClaimed = assignedValues.filter((a) => a === v).length
    const appearsBeforeThis = poolSource.slice(0, i).filter((p) => p === v).length
    return appearsBeforeThis >= alreadyClaimed
  })

  function handleDrop(ability: string) {
    if (draggedValue === null) return
    setAssignment((cur) => ({ ...cur, [ability]: draggedValue }))
    onAbilityManualChange(ability, draggedValue)
    setDraggedValue(null)
  }

  function handleSlotTap(ability: string) {
    if (touchSelected === null) return
    setAssignment((cur) => ({ ...cur, [ability]: touchSelected }))
    onAbilityManualChange(ability, touchSelected)
    setTouchSelected(null)
  }

  function handleReroll() {
    // Seed animFaces with initial random values so dice start cycling immediately
    setAnimFaces(Array.from({ length: 6 }, () =>
      Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
    ))
    // Animate each set sequentially (CSS spin + face cycling via useEffect above)
    const PER_SET = 120
    const ANIM_DURATION = 300
    for (let i = 0; i < 6; i++) {
      setTimeout(() => setRollingSet(i), i * PER_SET)
      setTimeout(() => setRollingSet(null), i * PER_SET + ANIM_DURATION)
    }
    // After all animations finish, fire the real roll and clear the anim overlay
    setTimeout(() => {
      setAnimFaces(null)
      onRollAbilities()
    }, 5 * PER_SET + ANIM_DURATION + 30)
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

  const statValueStyle = (positive: boolean): React.CSSProperties => ({
    display: 'block',
    fontSize: '1.4rem',
    fontWeight: 700,
    fontFamily: 'Cinzel, serif',
    color: positive ? '#6b2737' : '#8B1010',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{DICE_SPIN_CSS}</style>

      {/* Method selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        <MethodButton active={abilityMethod === 'roll'} onClick={onRollAbilities}>Roll 4d6</MethodButton>
        <MethodButton active={abilityMethod === 'array'} onClick={onStandardArray}>Standard Array</MethodButton>
        <MethodButton active={abilityMethod === 'pointbuy'} onClick={onPointBuy}>Point Buy</MethodButton>
        <MethodButton active={abilityMethod === 'manual'} onClick={onManualEntry}>Manual Entry</MethodButton>
      </div>

      {/* ── ROLL MODE ── */}
      {abilityMethod === 'roll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Dice sets display */}
          {(rolledSets.length === 6 || animFaces !== null) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {Array.from({ length: 6 }).map((_, si) => {
                // During animation show cycling faces; otherwise show real rolled values
                const rawSet = animFaces ? animFaces[si] : (rolledSets[si] ?? [1, 1, 1, 1])
                const sorted = [...rawSet].sort((a, b) => b - a) // desc: highest first
                const total = animFaces ? '?' : sorted.slice(0, 3).reduce((s, v) => s + v, 0)
                return (
                  <div key={si} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '5px 8px',
                    background: 'var(--parchment-light)',
                    border: '1px solid var(--gold-rule)',
                    borderTop: '2px solid #6b2737',
                  }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.58rem', color: 'var(--ink)', minWidth: 38, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
                      Set {si + 1}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {sorted.map((face, di) => {
                        const isDropped = di === 3
                        return (
                          <div key={di} style={{
                            width: 26, height: 26,
                            background: isDropped ? 'var(--parchment-dark)' : 'var(--parchment-light)',
                            border: `1px solid ${isDropped ? 'var(--gold-rule)' : 'var(--gold)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Cinzel, serif', fontSize: '0.8rem',
                            color: isDropped ? 'var(--ink)' : '#6b2737',
                            fontWeight: isDropped ? 400 : 700,
                            opacity: isDropped ? 0.35 : 1,
                            textDecoration: isDropped ? 'line-through' : undefined,
                            animation: rollingSet === si ? 'diceSpin 0.3s ease-out' : undefined,
                          }}>
                            {face}
                          </div>
                        )
                      })}
                    </div>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 700, color: '#6b2737' }}>
                      {total}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Roll / Re-roll button */}
          <button
            type="button"
            onClick={handleReroll}
            style={{
              background: '#6b2737', border: '1px solid #4a1a25',
              color: 'var(--parchment)',
              fontFamily: 'Cinzel, serif', fontSize: '0.75rem', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              padding: '9px 18px', cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            {rolledSets.length === 6 || animFaces !== null ? 'Re-roll All' : 'Roll 4d6 × 6'}
          </button>

          {/* Drag-drop pool + assignment — hidden while animating */}
          {rolledSets.length === 6 && animFaces === null && (
            <PoolAssignment
              poolSource={rolledTotals}
              poolRemaining={poolRemaining}
              assignment={assignment}
              draggedValue={draggedValue}
              touchSelected={touchSelected}
              onDragStart={setDraggedValue}
              onDragEnd={() => setDraggedValue(null)}
              onTouchSelect={(v) => setTouchSelected(touchSelected === v ? null : v)}
              onDrop={handleDrop}
              onSlotTap={handleSlotTap}
            />
          )}

          {rolledSets.length === 0 && animFaces === null && (
            <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
              Click "Roll 4d6 × 6" to generate your scores.
            </p>
          )}
        </div>
      )}

      {/* ── STANDARD ARRAY MODE ── */}
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
            onDrop={handleDrop}
            onSlotTap={handleSlotTap}
          />
        </div>
      )}

      {/* ── POINT BUY MODE ── */}
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
                const canDec = value > 8
                const canInc = value < 18 && pointBuyRemaining > 0
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

// ── Shared drag-drop pool + assignment grid (used by both roll and array modes) ──

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
      {/* Unassigned pool */}
      <div style={{
        display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: 40,
        padding: '6px 8px',
        background: 'var(--parchment-dark)',
        border: '1px solid var(--gold-rule)',
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
              outline: touchSelected === v ? '2px solid var(--gold)' : undefined,
            }}
          >
            {v}
          </div>
        ))}
      </div>

      {/* Ability slots */}
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
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                borderTopWidth: '2px',
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
