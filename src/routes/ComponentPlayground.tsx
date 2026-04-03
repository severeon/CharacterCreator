import { useState, useMemo } from 'react'
import { useParams } from 'react-router'
import { componentRegistry } from '../dev/componentRegistry'

interface LogEntry {
  ts: string
  name: string
  args: unknown[]
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ComponentPlayground() {
  const { name } = useParams<{ name: string }>()
  const [log, setLog] = useState<LogEntry[]>([])

  const entry = name ? componentRegistry[name] : undefined

  // Wrap all on* callback keys so payloads are captured in the log.
  // Each registry entry includes on* props as `undefined` so they appear in the scan.
  const wrappedProps = useMemo(() => {
    if (!entry) return {}
    const props: Record<string, unknown> = { ...entry.defaultProps }
    for (const key of Object.keys(props)) {
      if (key.startsWith('on')) {
        const original = props[key]
        props[key] = (...args: unknown[]) => {
          setLog((prev) => [{ ts: timestamp(), name: key, args }, ...prev])
          if (typeof original === 'function') original(...args)
        }
      }
    }
    return props
  }, [entry])

  if (!entry) {
    return (
      <div style={{ padding: '2rem', fontFamily: "'Cinzel', serif", color: 'var(--gold-dim, #B8954A)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Component not found</h2>
        <p style={{ fontSize: '0.8rem', color: 'rgba(184,149,74,0.6)' }}>
          No registry entry for <code>"{name}"</code>. Check <code>src/dev/componentRegistry.tsx</code>.
        </p>
      </div>
    )
  }

  const Component = entry.component

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Component area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(184,149,74,0.5)',
          }}>
            App Components
          </span>
          <span style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: '0.75rem',
            color: 'rgba(184,149,74,0.8)',
          }}>
            {entry.label}
          </span>
        </div>
        <Component {...wrappedProps} />
      </div>

      {/* Output log panel */}
      <div style={{
        borderTop: '1px solid rgba(184,149,74,0.2)',
        background: 'rgba(0,0,0,0.25)',
        flexShrink: 0,
        maxHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 1rem',
          borderBottom: '1px solid rgba(184,149,74,0.15)',
        }}>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.55rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(184,149,74,0.5)',
          }}>
            Output
          </span>
          {log.length > 0 && (
            <button
              type="button"
              onClick={() => setLog([])}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.55rem',
                color: 'rgba(184,149,74,0.45)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '2px 4px',
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '0.5rem 1rem' }}>
          {log.length === 0 ? (
            <p style={{
              fontFamily: "'IM Fell English', Georgia, serif",
              fontSize: '0.65rem',
              fontStyle: 'italic',
              color: 'rgba(184,149,74,0.3)',
              margin: 0,
            }}>
              Interact with the component to see callback output here.
            </p>
          ) : (
            log.map((logEntry, i) => (
              <div key={i} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.6rem',
                  color: 'rgba(184,149,74,0.6)',
                  marginBottom: '2px',
                }}>
                  {logEntry.ts} &nbsp; <span style={{ color: '#D4B468' }}>{logEntry.name}</span>
                </div>
                <pre style={{
                  margin: 0,
                  fontFamily: '"Fira Code", "Courier New", monospace',
                  fontSize: '0.65rem',
                  color: 'rgba(242,228,196,0.8)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {JSON.stringify(logEntry.args.length === 1 ? logEntry.args[0] : logEntry.args, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
