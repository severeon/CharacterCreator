import { ALL_SKILLS } from '../../lib/dnd35/skills'

interface SkillsStepProps {
  abilities: Record<string, number>
  skillAllocations: Record<string, number>
  classSkillNames: string[]
  skillPointsRemaining: number
  onAllocateSkill: (skill: string, delta: number) => void
  onContinue: () => void
  onBack: () => void
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

const allocBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '24px',
  height: '24px',
  background: disabled ? 'transparent' : 'var(--parchment-dark)',
  border: `1px solid ${disabled ? 'rgba(155,120,50,0.2)' : 'var(--gold-rule)'}`,
  fontFamily: "'Cinzel', serif",
  fontSize: '0.8rem',
  fontWeight: 700,
  color: disabled ? 'rgba(92,61,30,0.25)' : 'var(--ink-mid)',
  cursor: disabled ? 'default' : 'pointer',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

export function SkillsStep({
  abilities,
  skillAllocations,
  classSkillNames,
  skillPointsRemaining,
  onAllocateSkill,
}: SkillsStepProps) {
  const level = 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-mid)' }}>
        <span style={{ color: 'var(--burgundy)', fontSize: '1rem' }}>{skillPointsRemaining}</span>
        {' '}skill points remaining
      </p>

      <div style={{ maxHeight: '24rem', overflowY: 'auto', border: '1px solid var(--gold-rule)', borderTop: '2px solid var(--burgundy)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr style={{ background: 'var(--burgundy)' }}>
              {['Skill', 'Key', 'Ranks', 'Cost', 'Allocate'].map((h, i) => (
                <th key={h} style={{
                  padding: '5px 10px',
                  textAlign: i === 0 ? 'left' : 'center',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--parchment-light)',
                  borderRight: i < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_SKILLS.map((skill, rowIdx) => {
              const isClassSkill = classSkillNames.some(
                (cs) => cs.toLowerCase() === skill.name.toLowerCase()
              )
              const cost = isClassSkill ? 1 : 2
              const maxRanks = isClassSkill ? level + 3 : Math.floor((level + 3) / 2)
              const currentRanks = skillAllocations[skill.name] || 0
              const abilityKey = skill.ability.toLowerCase()
              const abilityMod = abilities[abilityKey] ?? 10
              const modValue = abilityModifier(abilityMod)
              const totalBonus = currentRanks + modValue
              const isEven = rowIdx % 2 === 1

              const rowBg = currentRanks > 0
                ? 'rgba(107, 20, 20, 0.07)'
                : isEven
                  ? 'rgba(155, 120, 50, 0.06)'
                  : 'var(--parchment-light)'

              return (
                <tr key={skill.name} style={{
                  background: rowBg,
                  borderBottom: '1px solid rgba(155, 120, 50, 0.15)',
                }}>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{
                      fontFamily: isClassSkill ? "'Cinzel', serif" : "'Libre Baskerville', serif",
                      fontWeight: isClassSkill ? 600 : 400,
                      fontSize: isClassSkill ? '0.75rem' : '0.8rem',
                      color: isClassSkill ? 'var(--ink)' : 'var(--ink-light)',
                      letterSpacing: isClassSkill ? '0.03em' : 0,
                    }}>
                      {skill.name}
                    </span>
                    {isClassSkill && (
                      <span style={{
                        marginLeft: '5px',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '0.52rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--burgundy)',
                        background: 'rgba(107,20,20,0.1)',
                        border: '1px solid rgba(107,20,20,0.2)',
                        padding: '1px 4px',
                        borderRadius: '1px',
                        verticalAlign: 'middle',
                      }}>
                        Class
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center', color: 'var(--ink-light)', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', fontWeight: 600 }}>
                    {skill.ability}
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    {currentRanks > 0 ? (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 700, color: 'var(--burgundy)' }}>
                        {currentRanks}
                        <span style={{ fontWeight: 400, color: 'var(--ink-light)', fontSize: '0.65rem' }}>
                          {' '}={totalBonus >= 0 ? '+' : ''}{totalBonus}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-light)', fontSize: '0.75rem' }}>
                        {modValue >= 0 ? '+' : ''}{modValue}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center', color: isClassSkill ? 'var(--burgundy)' : 'var(--ink-light)', fontFamily: "'Cinzel', serif", fontSize: '0.72rem', fontWeight: isClassSkill ? 700 : 400 }}>
                    {cost}
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <button
                        onClick={() => onAllocateSkill(skill.name, -1)}
                        disabled={currentRanks <= 0}
                        style={allocBtnStyle(currentRanks <= 0)}
                      >
                        −
                      </button>
                      <span style={{ width: '20px', textAlign: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink)' }}>
                        {currentRanks}
                      </span>
                      <button
                        onClick={() => onAllocateSkill(skill.name, 1)}
                        disabled={currentRanks >= maxRanks || skillPointsRemaining < cost}
                        style={allocBtnStyle(currentRanks >= maxRanks || skillPointsRemaining < cost)}
                      >
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
    </div>
  )
}
