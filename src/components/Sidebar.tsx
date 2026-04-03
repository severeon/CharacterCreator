import { NavLink } from 'react-router'
import { isTauri } from '../lib/platform'
import { componentRegistry } from '../dev/componentRegistry'

const ENTITY_TYPES = [
  { type: 'races', label: 'Races', icon: '🧝' },
  { type: 'classes', label: 'Classes', icon: '⚔️' },
  { type: 'feats', label: 'Feats', icon: '✦' },
  { type: 'spells', label: 'Spells', icon: '✦' },
]

export default function Sidebar() {
  return (
    <nav
      style={{
        width: '13rem',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #1E0F08 0%, #2D160C 60%, #1A0A05 100%)',
        borderRight: '2px solid #4A2010',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '3px 0 12px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Leather texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        zIndex: 0,
      }} />

      {/* Gold top border accent */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #B8954A, #D4B468, #B8954A, transparent)', flexShrink: 0, position: 'relative', zIndex: 1 }} />

      <div style={{ padding: '1.4rem 1rem 1rem', position: 'relative', zIndex: 1 }}>
        {/* App title */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#D4B468',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            lineHeight: 1.3,
          }}>
            Character
          </div>
          <div style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#D4B468',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Creator
          </div>
          <div style={{
            marginTop: '0.3rem',
            fontFamily: "'Libre Baskerville', serif",
            fontSize: '0.6rem',
            color: 'rgba(212, 180, 104, 0.5)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontStyle: 'italic',
          }}>
            D&amp;D 3.5e Reference
          </div>
        </div>

        {/* Gold rule */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #9A7B2C, transparent)', margin: '0.75rem 0' }} />

        {/* Create Character CTA */}
        <NavLink
          to="/creation"
          style={({ isActive }) => ({
            display: 'block',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.68rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            padding: '7px 10px',
            marginBottom: '0.25rem',
            borderRadius: '2px',
            border: `1px solid ${isActive ? '#D4B468' : 'rgba(184, 149, 74, 0.35)'}`,
            background: isActive
              ? 'linear-gradient(135deg, #6B1414 0%, #8B2020 100%)'
              : 'rgba(184, 149, 74, 0.07)',
            color: isActive ? '#F2E4C4' : '#C4A24A',
            transition: 'all 0.15s',
          })}
        >
          ✦ Create Character
        </NavLink>

        {/* Gold rule */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #9A7B2C, transparent)', margin: '1rem 0 0.6rem' }} />

        {/* Section label */}
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.55rem',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(184, 149, 74, 0.55)',
          marginBottom: '0.6rem',
          paddingLeft: '2px',
        }}>
          Compendium
        </div>

        {/* Nav items */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {ENTITY_TYPES.map(({ type, label }) => (
            <li key={type}>
              <NavLink
                to={`/${type}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.06em',
                  textDecoration: 'none',
                  padding: '5px 10px',
                  borderRadius: '2px',
                  borderLeft: `3px solid ${isActive ? '#8B2020' : 'transparent'}`,
                  background: isActive ? 'rgba(107, 20, 20, 0.3)' : 'transparent',
                  color: isActive ? '#F2E4C4' : 'rgba(212, 180, 104, 0.7)',
                  transition: 'all 0.12s',
                })}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* App Components section — web only */}
        {!isTauri && (
          <>
            {/* Gold rule */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #9A7B2C, transparent)', margin: '1rem 0 0.6rem' }} />

            {/* Section label */}
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.55rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(184, 149, 74, 0.55)',
              marginBottom: '0.6rem',
              paddingLeft: '2px',
            }}>
              App Components
            </div>

            {/* Component nav items */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {Object.entries(componentRegistry).map(([slug, entry]) => (
                <li key={slug}>
                  <NavLink
                    to={`/dev/components/${slug}`}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.65rem',
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: '0.06em',
                      textDecoration: 'none',
                      padding: '4px 10px',
                      borderRadius: '2px',
                      borderLeft: `3px solid ${isActive ? '#8B2020' : 'transparent'}`,
                      background: isActive ? 'rgba(107, 20, 20, 0.3)' : 'transparent',
                      color: isActive ? '#F2E4C4' : 'rgba(212, 180, 104, 0.55)',
                      transition: 'all 0.12s',
                    })}
                  >
                    {entry.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Bottom flourish */}
      <div style={{ marginTop: 'auto', padding: '1rem', position: 'relative', zIndex: 1 }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #9A7B2C, transparent)', marginBottom: '0.75rem' }} />
        <div style={{
          fontFamily: "'IM Fell English', Georgia, serif",
          fontSize: '0.6rem',
          fontStyle: 'italic',
          color: 'rgba(184, 149, 74, 0.35)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          "Roll for initiative."
        </div>
      </div>
    </nav>
  )
}
