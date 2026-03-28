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

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const loaded = await getDmSettings()
      setSettings(loaded)
    } catch (err) {
      console.error('Failed to load DM settings:', err)
    }
  }

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
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-purple-600 text-white px-2 py-4 rounded-l-lg shadow-lg z-40 hover:bg-purple-700 transition-colors"
        title="Open DM Tools"
      >
        <span className="writing-mode-vertical text-sm font-bold">DM TOOLS</span>
      </button>
    )
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-50 border-l border-gray-300 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
        <h2 className="font-bold text-lg">DM Tools</h2>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-purple-700 rounded"
          title="Close DM Tools"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
      <div className="p-4 border-t bg-white">
        <button
          onClick={saveSettings}
          disabled={!hasChanges}
          className={`w-full py-2 rounded-lg font-medium transition-colors ${
            hasChanges
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {hasChanges ? 'Save Settings' : 'Saved'}
        </button>
      </div>
    </div>
  )
}
