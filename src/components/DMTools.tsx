import { useState, useEffect } from 'react'
import { getDmSettings, setDmSettings, type DMSettings } from '../lib/engine'

interface DMToolsProps {
  isOpen: boolean
  onToggle: () => void
}

const DEFAULT_SETTINGS: DMSettings = {
  ability_method: 'pointbuy',
  max_ability_score: 18,
  gestalt_required: false,
  no_templates: false,
  max_ecl: 20,
  no_racial_hd: false,
  enforce_prerequisites: false,
  notes: '',
  restricted_entities: [],
}

export default function DMTools({ isOpen, onToggle }: DMToolsProps) {
  const [settings, setSettings] = useState<DMSettings>(DEFAULT_SETTINGS)
  const [hasChanges, setHasChanges] = useState(false)

  async function loadSettings() {
    try {
      const loaded = await getDmSettings()
      setSettings(loaded)
    } catch (err) {
      console.error('Failed to load DM settings:', err)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings()
  }, [])

  async function saveSettings() {
    try {
      await setDmSettings(settings)
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save DM settings:', err)
    }
  }

  function updateSetting<K extends keyof DMSettings>(key: K, value: DMSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        title="Open DM Tools"
        style={{
          position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
          background: 'var(--burgundy)',
          color: 'var(--parchment-light)',
          border: 'none',
          borderLeft: '1px solid var(--gold-rule)',
          borderTop: '1px solid var(--gold-rule)',
          borderBottom: '1px solid var(--gold-rule)',
          padding: '1rem 0.5rem',
          cursor: 'pointer',
          zIndex: 40,
          writingMode: 'vertical-rl',
          fontFamily: "'Cinzel', serif",
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.3)',
        }}
      >
        DM Screen
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, height: '100%', width: '20rem',
      background: 'var(--parchment-light)',
      borderLeft: '2px solid var(--gold-rule)',
      boxShadow: '-4px 0 20px rgba(28,16,8,0.3)',
      zIndex: 50,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        background: 'var(--burgundy)',
        borderBottom: '2px solid var(--gold-rule)',
      }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--parchment-light)', margin: 0 }}>DM Screen</h2>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', color: 'var(--parchment-light)', cursor: 'pointer', fontSize: '1rem', opacity: 0.8, padding: '0 4px' }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Ability Score Method */}
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Ability Score Method</h3>
          <div className="space-y-2">
            {[
              { value: 'manual', label: 'Manual Entry' },
              { value: 'array', label: 'Standard Array' },
              { value: 'pointbuy', label: 'Point Buy (27 pts)' },
              { value: 'roll', label: 'Roll 4d6 × 6' },
            ].map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ability_method"
                  value={option.value}
                  checked={settings.ability_method === option.value}
                  onChange={(e) => updateSetting('ability_method', e.target.value)}
                  className="text-purple-600"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Stat Limits */}
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Stat Limits</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max Starting Ability Score</label>
              <input
                type="number"
                value={settings.max_ability_score}
                onChange={(e) => updateSetting('max_ability_score', parseInt(e.target.value) || 18)}
                min={10}
                max={25}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Campaign Restrictions */}
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Campaign Restrictions</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gestalt_required}
                onChange={(e) => updateSetting('gestalt_required', e.target.checked)}
                className="rounded text-purple-600"
              />
              <span className="text-sm">Gestalt Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.no_templates}
                onChange={(e) => updateSetting('no_templates', e.target.checked)}
                className="rounded text-purple-600"
              />
              <span className="text-sm">No Templates (LA Buyoff)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.no_racial_hd}
                onChange={(e) => updateSetting('no_racial_hd', e.target.checked)}
                className="rounded text-purple-600"
              />
              <span className="text-sm">No Racial HD (ECL from Level 1)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enforce_prerequisites}
                onChange={(e) => updateSetting('enforce_prerequisites', e.target.checked)}
                className="rounded text-purple-600"
              />
              <span className="text-sm">Enforce Prerequisites</span>
            </label>
            <div className="pt-2">
              <label className="block text-sm text-gray-600 mb-1">Max ECL</label>
              <input
                type="number"
                value={settings.max_ecl}
                onChange={(e) => updateSetting('max_ecl', parseInt(e.target.value) || 20)}
                min={1}
                max={30}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Notes for Players */}
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Notes for Players</h3>
          <textarea
            value={settings.notes}
            onChange={(e) => updateSetting('notes', e.target.value)}
            placeholder="Campaign notes, house rules, etc..."
            rows={4}
            className="w-full px-3 py-2 border rounded-lg resize-none"
          />
        </section>

        {/* Restricted Content */}
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Restricted Content</h3>
          <p className="text-xs text-gray-500 mb-2">
            Entities added here will be hidden from player view.
          </p>
          <div className="bg-white border rounded-lg p-3 min-h-[80px]">
            {settings.restricted_entities.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No restrictions</p>
            ) : (
              <ul className="space-y-1">
                {settings.restricted_entities.map((entity, i) => (
                  <li key={i} className="text-sm flex items-center justify-between">
                    <span>{entity}</span>
                    <button
                      onClick={() => updateSetting('restricted_entities',
                        settings.restricted_entities.filter((_, idx) => idx !== i)
                      )}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--gold-rule)', background: 'var(--parchment)' }}>
        <button
          onClick={saveSettings}
          disabled={!hasChanges}
          style={{
            width: '100%',
            padding: '7px',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            border: `1px solid ${hasChanges ? 'var(--gold-rule)' : 'rgba(155,120,50,0.25)'}`,
            background: hasChanges ? 'var(--burgundy)' : 'transparent',
            color: hasChanges ? 'var(--parchment-light)' : 'var(--ink-light)',
            cursor: hasChanges ? 'pointer' : 'default',
            opacity: hasChanges ? 1 : 0.5,
          }}
        >
          {hasChanges ? 'Save Settings' : 'Saved'}
        </button>
      </div>
    </div>
  )
}
