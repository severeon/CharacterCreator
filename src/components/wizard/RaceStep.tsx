import type { Entity } from '../../lib/types'
import { RaceWizardCard } from '../entities/race'

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
          <RaceWizardCard
            key={race.id}
            entity={race}
            selected={selectedRace?.id === race.id}
            onSelect={() => onSelectRace(race)}
          />
        ))}
      </div>
    </div>
  )
}
