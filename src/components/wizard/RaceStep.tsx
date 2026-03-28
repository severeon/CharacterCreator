import type { Entity } from '../../lib/types'
import { getPropertyString } from '../../lib/properties'

interface RaceStepProps {
  races: Entity[]
  selectedRace: Entity | null
  onSelectRace: (race: Entity) => void
}

export function RaceStep({ races, selectedRace, onSelectRace }: RaceStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Choose Your Race</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {races.map((race) => (
          <button
            key={race.id}
            onClick={() => onSelectRace(race)}
            className={`p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left ${
              selectedRace?.id === race.id ? 'border-blue-500 bg-blue-50' : ''
            }`}
          >
            <h3 className="font-bold">
              {getPropertyString(race.properties, 'name', race.id)}
            </h3>
            {getPropertyString(race.properties, 'size', '') && (
              <p className="text-sm text-gray-600">
                Size: {getPropertyString(race.properties, 'size', '')}
              </p>
            )}
            {getPropertyString(race.properties, 'speed', '') && (
              <p className="text-sm text-gray-600">
                Speed: {getPropertyString(race.properties, 'speed', '')}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
