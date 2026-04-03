import React, { useState } from 'react'

interface RollAbilitiesStepProps {
  rolledSets: number[][]
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
}

const DICE_CSS = `
@keyframes diceSpin2d {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}
@keyframes diceSpin3d {
  0% { transform: rotateX(0deg) rotateY(0deg); }
  100% { transform: rotateX(360deg) rotateY(360deg); }
}
`

const METHOD_INFO: Record<string, string> = {
  roll: 'Roll 4d6, drop the lowest. Assign scores in the next step.',
  array: 'Assign the standard array: 15, 14, 13, 12, 10, 8.',
  pointbuy: 'Spend 27 points. Scores 8–18, costs increase at higher values.',
  manual: 'Enter any scores from 1–20 (DM override: 1–30).',
}

const STANDARD_ARRAY_VALUES = [15, 14, 13, 12, 10, 8]

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

export function RollAbilitiesStep({
  rolledSets,
  abilityMethod,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
}: RollAbilitiesStepProps) {
  const [diceMode, setDiceMode] = useState<'2d' | '3d'>('2d')
  const [rolling, setRolling] = useState<number | null>(null)

  function handleRollAll() {
    onRollAbilities()
    // Animate sets 0–5 in sequence with 150ms delays
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        setRolling(i)
        setTimeout(() => setRolling(null), 200)
      }, i * 150)
    }
  }

  const hasRolls = rolledSets.length > 0 && rolledSets.length >= 6

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{DICE_CSS}</style>

      {/* Method selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        <MethodButton active={abilityMethod === 'roll'} onClick={onRollAbilities}>Roll 4d6</MethodButton>
        <MethodButton active={abilityMethod === 'array'} onClick={onStandardArray}>Standard Array</MethodButton>
        <MethodButton active={abilityMethod === 'pointbuy'} onClick={onPointBuy}>Point Buy</MethodButton>
        <MethodButton active={abilityMethod === 'manual'} onClick={onManualEntry}>Manual Entry</MethodButton>
      </div>

      {/* Info box */}
      <div style={{
        borderLeft: '3px solid var(--gold)',
        background: 'var(--parchment-dark)',
        padding: '8px 12px',
        fontFamily: "'Libre Baskerville', serif",
        fontSize: '0.82rem',
        color: 'var(--ink)',
        lineHeight: 1.55,
      }}>
        {METHOD_INFO[abilityMethod]}
      </div>

      {/* Dice roller section */}
      {abilityMethod === 'roll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* 2D / 3D toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--ink)', letterSpacing: '0.06em' }}>
              Dice Style:
            </span>
            {(['2d', '3d'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDiceMode(mode)}
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: '1px solid #6b2737',
                  background: diceMode === mode ? '#6b2737' : 'var(--parchment-light)',
                  color: diceMode === mode ? 'var(--parchment)' : '#6b2737',
                  cursor: 'pointer',
                }}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {/* 6 dice sets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: 6 }).map((_, setIndex) => {
              const set = hasRolls ? rolledSets[setIndex] : null
              // The 4 dice values (sorted descending for display, lowest faded)
              const dice: number[] = set ? [...set].sort((a, b) => b - a) : [0, 0, 0, 0]
              const total = set ? dice.slice(0, 3).reduce((s, v) => s + v, 0) : null
              const isAnimating = rolling === setIndex

              return (
                <div
                  key={setIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '6px 10px',
                    background: set ? 'var(--parchment-light)' : 'var(--parchment)',
                    border: '1px solid var(--gold-rule)',
                    borderTop: set ? '3px solid #6b2737' : '1px solid var(--gold-rule)',
                  }}
                >
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: 'var(--ink)', minWidth: 48, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Set {setIndex + 1}
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {dice.map((face, dieIdx) => {
                      const isLowest = dieIdx === 3 // sorted descending, last is lowest
                      const animation = isAnimating
                        ? `${diceMode === '3d' ? 'diceSpin3d' : 'diceSpin2d'} 0.2s ease-out`
                        : undefined
                      return (
                        <div
                          key={dieIdx}
                          style={{
                            width: 32, height: 32,
                            background: 'var(--parchment-light)',
                            border: '1px solid var(--gold)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Cinzel, serif',
                            fontSize: '0.9rem',
                            color: 'var(--ink)',
                            opacity: isLowest ? 0.4 : 1,
                            textDecoration: isLowest ? 'line-through' : undefined,
                            animation,
                            transformStyle: diceMode === '3d' ? 'preserve-3d' : undefined,
                          }}
                        >
                          {set ? face : '—'}
                        </div>
                      )
                    })}
                  </div>
                  {total !== null && (
                    <span style={{
                      marginLeft: 'auto',
                      fontFamily: 'Cinzel, serif',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#6b2737',
                    }}>
                      {total}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Roll / Re-roll button */}
          <button
            type="button"
            onClick={handleRollAll}
            style={{
              background: '#6b2737',
              border: '1px solid #4a1a25',
              color: 'var(--parchment)',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              padding: '10px 20px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {hasRolls ? 'Re-roll All' : 'Roll All 6'}
          </button>
        </div>
      )}

      {/* Standard array chips */}
      {abilityMethod === 'array' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
            Drag-and-drop assignment happens in the next step.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {STANDARD_ARRAY_VALUES.map((v) => (
              <span
                key={v}
                className="dnd-tag"
                style={{
                  background: '#6b2737',
                  color: 'var(--parchment)',
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '4px 12px',
                  border: '1px solid #4a1a25',
                }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Point buy / manual note */}
      {(abilityMethod === 'pointbuy' || abilityMethod === 'manual') && (
        <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
          Configure your scores in the next step.
        </p>
      )}
    </div>
  )
}
