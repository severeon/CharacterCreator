import { Link } from 'react-router'

const SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation', 'Universal',
]

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const CLASSES = [
  'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard',
]

function CategoryCard({ to, label, subtitle }: { to: string; label: string; subtitle?: string }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div className="entity-card" style={{ padding: '12px 14px' }}>
        <div className="entity-card-title" style={{ borderBottom: 'none', padding: 0 }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-light)', fontFamily: "'Libre Baskerville', serif", marginTop: '2px' }}>
            {subtitle}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function SpellIndex() {
  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '72rem' }}>
      <h2 className="dnd-page-header">Spells</h2>

      {/* By School */}
      <h3 className="dnd-section-header" style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--burgundy)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        By School
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {SCHOOLS.map(s => (
          <CategoryCard key={s} to={`/spells/school/${s.toLowerCase()}`} label={s} subtitle="School of Magic" />
        ))}
      </div>

      {/* By Level */}
      <h3 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--burgundy)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        By Spell Level
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {LEVELS.map(l => (
          <CategoryCard key={l} to={`/spells/level/${l}`} label={l === 0 ? 'Cantrips' : `Level ${l}`} />
        ))}
      </div>

      {/* By Class */}
      <h3 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--burgundy)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        By Class
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {CLASSES.map(c => (
          <CategoryCard key={c} to={`/spells/class/${c.toLowerCase()}`} label={c} subtitle="Spell List" />
        ))}
      </div>
    </div>
  )
}
