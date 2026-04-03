import type { Entity } from '../../lib/types'
import { getPropertyString } from '../../lib/properties'

interface StartingPackageStepProps {
  selectedClass: Entity | null
  onAccept: () => void
  onCustomize: () => void
  onBack: () => void
}

function WizardBtn({ onClick, variant, children }: {
  onClick: () => void
  variant: 'primary' | 'secondary'
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: variant === 'primary' ? 'var(--burgundy)' : 'transparent',
        border: `1px solid ${variant === 'primary' ? 'var(--burgundy-dark)' : 'var(--gold-rule)'}`,
        fontFamily: "'Cinzel', serif",
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: variant === 'primary' ? 'var(--parchment-light)' : 'var(--ink-mid)',
        padding: '7px 18px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export function StartingPackageStep({ selectedClass, onAccept, onCustomize, onBack }: StartingPackageStepProps) {
  const className = selectedClass
    ? getPropertyString(selectedClass.properties, 'name', 'Unknown Class')
    : 'Unknown Class'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.875rem', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
        Each class description includes a starting package with suggested skills, feats, and equipment.
        Review the {className}'s starting package below.
      </p>

      {/* Package display */}
      <div style={{ background: 'var(--parchment-dark)', border: '1px solid var(--gold-rule)', borderTop: '2px solid var(--burgundy)' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--gold-rule)', background: 'rgba(107,20,20,0.05)' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--ink)' }}>
            Class: {className}
          </span>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.78rem', color: 'var(--ink-light)', marginTop: '3px', lineHeight: 1.5 }}>
            Review the suggested selections below. Accept them to quickly complete character creation, or customize your own.
          </p>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(155,120,50,0.2)' }}>
          <div className="dnd-section-header" style={{ marginBottom: '5px' }}>Suggested Skills</div>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.8rem', color: 'var(--ink-mid)' }}>
            Skills based on your class's strengths will be listed here.
          </p>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(155,120,50,0.2)' }}>
          <div className="dnd-section-header" style={{ marginBottom: '5px' }}>Suggested Feat</div>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.8rem', color: 'var(--ink-mid)' }}>
            A feat appropriate for the class will appear here.
          </p>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(155,120,50,0.2)' }}>
          <div className="dnd-section-header" style={{ marginBottom: '5px' }}>Suggested Equipment</div>
          <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.8rem', color: 'var(--ink-mid)' }}>
            Standard equipment bundle for adventuring.
          </p>
        </div>

        <div className="dnd-note-box" style={{ margin: '10px 12px' }}>
          <strong style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--burgundy)' }}>
            Note:{' '}
          </strong>
          Starting package functionality is a preview. Full class-specific starting packages coming soon.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
        <WizardBtn onClick={onBack} variant="secondary">Back</WizardBtn>
        <WizardBtn onClick={onCustomize} variant="secondary">Customize My Own</WizardBtn>
        <WizardBtn onClick={onAccept} variant="primary">Accept Starting Package</WizardBtn>
      </div>
    </div>
  )
}
