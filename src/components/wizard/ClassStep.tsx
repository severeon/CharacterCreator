import type { Entity } from '../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../lib/properties'
import { ClassWizardCard } from '../entities/class'

interface ClassStepProps {
  classes: Entity[]
  selectedClass: Entity | null
  selectedClassB: Entity | null
  isGestalt: boolean
  onToggleGestalt: (v: boolean) => void
  onSelectClass: (cls: Entity, slot: 'A' | 'B') => void
  onContinue: () => void
  onBack: () => void
}

export function ClassStep({
  classes,
  selectedClass,
  selectedClassB,
  isGestalt,
  onToggleGestalt,
  onSelectClass,
  onContinue,
  onBack,
}: ClassStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Choose Your Class</h2>

      {/* Gestalt Toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isGestalt}
            onChange={(e) => {
              onToggleGestalt(e.target.checked)
              if (!e.target.checked) {
                onSelectClass(null as unknown as Entity, 'B')
              }
            }}
            className="w-5 h-5 rounded"
          />
          <span className="font-medium">Enable Gestalt (Dual-Class)</span>
        </label>
        {isGestalt && (
          <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Both classes advance together each level
          </span>
        )}
      </div>

      {/* Class A Selection */}
      <div>
        <h3 className="font-semibold mb-2">
          Class A {isGestalt && '(Primary)'}
          {selectedClass && (
            <span className="ml-2 text-green-600">
              ✓ {getPropertyString(selectedClass.properties, 'name', selectedClass.id)}
            </span>
          )}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {classes.map((cls) => (
            <ClassWizardCard
              key={cls.id}
              entity={cls}
              selected={selectedClass?.id === cls.id}
              onSelect={(id) => onSelectClass(classes.find((c) => c.id === id) ?? cls, 'A')}
            />
          ))}
        </div>
      </div>

      {/* Class B Selection (Gestalt only) */}
      {isGestalt && (
        <div>
          <h3 className="font-semibold mb-2">
            Class B (Secondary)
            {selectedClassB && (
              <span className="ml-2 text-green-600">
                ✓ {getPropertyString(selectedClassB.properties, 'name', selectedClassB.id)}
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {classes.map((cls) => (
              <ClassWizardCard
                key={cls.id}
                entity={cls}
                selected={selectedClassB?.id === cls.id}
                onSelect={(id) => onSelectClass(classes.find((c) => c.id === id) ?? cls, 'B')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gestalt Summary */}
      {isGestalt && selectedClass && (
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-bold text-purple-800 mb-3">Gestalt Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-purple-600 block">ECL</span>
              <span className="text-xl font-bold">2</span>
              <span className="text-xs text-purple-500">(1 character + 1 class level)</span>
            </div>
            <div>
              <span className="text-purple-600 block">Hit Dice</span>
              <span className="text-xl font-bold">
                2d{getPropertyNumber(selectedClass.properties, 'hd', 8)}
                {selectedClassB &&
                  ` + 1d${getPropertyNumber(selectedClassB.properties, 'hd', 8)}`}
              </span>
            </div>
            <div>
              <span className="text-purple-600 block">BAB</span>
              <span className="text-xl font-bold">Full</span>
              <span className="text-xs text-purple-500">(Best of both)</span>
            </div>
            <div>
              <span className="text-purple-600 block">Saves</span>
              <span className="text-xl font-bold">Best</span>
              <span className="text-xs text-purple-500">(Best of each pair)</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border rounded-lg"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedClass || (isGestalt && !selectedClassB)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
