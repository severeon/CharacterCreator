const METHOD_LABELS: Record<string, string> = {
  roll: 'Roll 4d6 (×6)',
  array: 'Standard Array',
  pointbuy: 'Point Buy',
  manual: 'Manual',
}

interface RollAbilitiesStepProps {
  rolledSets: number[][]
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(155, 120, 50, 0.08)',
      border: '1px solid var(--gold-rule)',
      borderLeft: '3px solid var(--burgundy)',
      padding: '10px 14px',
      fontFamily: "'Libre Baskerville', serif",
      fontSize: '0.82rem',
      color: 'var(--ink-mid)',
      lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}

function MethodButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? 'var(--burgundy)' : 'var(--parchment-light)',
        border: `1px solid ${active ? 'var(--burgundy-dark)' : 'var(--gold-rule)'}`,
        fontFamily: "'Cinzel', serif",
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: active ? 'var(--parchment-light)' : 'var(--ink-mid)',
        padding: '6px 14px',
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.875rem', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
        Roll 4d6 and drop the lowest die. Repeat 6 times to generate your ability scores.
      </p>

      {/* Method Selection Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        <MethodButton active={abilityMethod === 'roll'} onClick={onRollAbilities}>
          {METHOD_LABELS.roll}
        </MethodButton>
        <MethodButton active={abilityMethod === 'array'} onClick={onStandardArray}>
          {METHOD_LABELS.array}
        </MethodButton>
        <MethodButton active={abilityMethod === 'pointbuy'} onClick={onPointBuy}>
          {METHOD_LABELS.pointbuy}
        </MethodButton>
        <MethodButton active={abilityMethod === 'manual'} onClick={onManualEntry}>
          {METHOD_LABELS.manual}
        </MethodButton>
      </div>

      {/* Rolled Sets Display */}
      {abilityMethod === 'roll' && rolledSets.length > 0 && rolledSets[0].length === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p className="dnd-section-header" style={{ display: 'inline-block', marginBottom: '0.25rem' }}>
            Your Rolled Scores
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--ink-light)', fontStyle: 'italic', fontFamily: "'IM Fell English', serif" }}>
            These 6 scores will be assigned after Race and Class selection.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
            {rolledSets[0].map((score, i) => (
              <div key={i} style={{
                background: 'var(--parchment-dark)',
                border: '1px solid var(--gold-rule)',
                borderTop: '2px solid var(--burgundy)',
                padding: '8px 4px',
                textAlign: 'center',
              }}>
                <span style={{ display: 'block', fontSize: '0.6rem', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em', color: 'var(--ink-light)', textTransform: 'uppercase' }}>
                  Score {i + 1}
                </span>
                <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 700, fontFamily: "'Cinzel', serif", color: 'var(--burgundy)' }}>
                  {score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard Array Preview */}
      {abilityMethod === 'array' && (
        <InfoBox>
          <strong style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--burgundy)', display: 'block', marginBottom: '4px' }}>
            Standard Array
          </strong>
          STR 15 · DEX 14 · CON 13 · INT 12 · WIS 10 · CHA 8
          <br />
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>
            These values will be available for assignment after Race and Class selection.
          </span>
        </InfoBox>
      )}

      {/* Point Buy Info */}
      {abilityMethod === 'pointbuy' && (
        <InfoBox>
          <strong style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--burgundy)', display: 'block', marginBottom: '4px' }}>
            Point Buy — 27 Points
          </strong>
          Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9, 16=12, 17=15, 18=19
          <br />
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>
            You'll adjust these after Race and Class selection.
          </span>
        </InfoBox>
      )}

      {/* Manual Entry Info */}
      {abilityMethod === 'manual' && (
        <InfoBox>
          You'll be able to enter ability scores manually after Race and Class selection.
        </InfoBox>
      )}
    </div>
  )
}
