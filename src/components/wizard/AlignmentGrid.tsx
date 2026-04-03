interface AlignmentGridProps {
  value: string
  onChange: (alignment: string) => void
  restrictions?: string[]
  unlocked?: boolean
}

const COLUMNS = ['Lawful', 'Neutral', 'Chaotic']
const ROWS = ['Good', 'Neutral', 'Evil']

// Maps row+col to the full alignment name
function alignmentName(row: string, col: string): string {
  if (row === 'Neutral' && col === 'Neutral') return 'True Neutral'
  return `${col} ${row}`
}

// Short abbreviation for each cell
function alignmentAbbr(row: string, col: string): string {
  if (row === 'Neutral' && col === 'Neutral') return 'N'
  const colAbbr = col === 'Neutral' ? 'N' : col[0]
  const rowAbbr = row === 'Neutral' ? 'N' : row[0]
  return `${colAbbr}${rowAbbr}`
}

export function AlignmentGrid({ value, onChange, restrictions = [], unlocked = false }: AlignmentGridProps) {
  return (
    <div style={{ display: 'inline-block' }}>
      {/* Grid container: 1 extra row for column headers, 1 extra col for row labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '56px repeat(3, 90px)',
          gridTemplateRows: 'auto repeat(3, 60px)',
          gap: 4,
        }}
      >
        {/* Top-left empty cell */}
        <div />

        {/* Column headers */}
        {COLUMNS.map((col) => (
          <div
            key={col}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.62rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--ink)',
              textAlign: 'center',
              paddingBottom: 4,
              borderBottom: '1px solid var(--gold-rule)',
            }}
          >
            {col}
          </div>
        ))}

        {/* Rows */}
        {ROWS.map((row) => (
          <>
            {/* Row label */}
            <div
              key={`label-${row}`}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '0.62rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 6,
                borderRight: '1px solid var(--gold-rule)',
              }}
            >
              {row}
            </div>

            {/* Alignment cells */}
            {COLUMNS.map((col) => {
              const name = alignmentName(row, col)
              const abbr = alignmentAbbr(row, col)
              const isSelected = value === name
              const isRestricted = !unlocked && restrictions.includes(name)

              return (
                <button
                  key={name}
                  onClick={() => !isRestricted && onChange(name)}
                  title={isRestricted ? 'Restricted by class or deity' : name}
                  style={{
                    width: 90,
                    height: 60,
                    border: isSelected
                      ? '2px solid var(--burgundy)'
                      : '1px solid var(--gold-rule)',
                    background: isSelected ? 'var(--burgundy)' : 'var(--parchment-light)',
                    color: isSelected ? 'var(--parchment-light)' : 'var(--ink)',
                    cursor: isRestricted ? 'not-allowed' : 'pointer',
                    opacity: isRestricted ? 0.4 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    padding: 4,
                    fontFamily: "'Cinzel', serif",
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                    {name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      opacity: 0.75,
                      fontFamily: "'Cinzel', serif",
                    }}
                  >
                    {abbr}
                  </span>
                </button>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}
