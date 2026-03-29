import type { Entity } from '../../lib/types'

interface EquipmentStepProps {
  startingGold: number
  selectedClass: Entity | null
  selectedRace: Entity | null
  onContinue: () => void
  onBack: () => void
}

export function EquipmentStep({
  startingGold,
  selectedClass,
  onContinue,
  onBack,
}: EquipmentStepProps) {
  // Default starting gold based on class
  const classGold表: Record<string, number> = {
    barbarian: 86,
    bard: 90,
    cleric: 97,
    druid: 82,
    fighter: 106,
    monk: 82,
    paladin: 130,
    ranger: 106,
    rogue: 100,
    sorcerer: 70,
    wizard: 70,
  }

  const classId = selectedClass?.id?.toLowerCase() || ''
  const gold = classGold表[classId] ?? startingGold
  const className = (selectedClass?.properties['name'] as string) ?? 'Unknown'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Step 9: Select Equipment</h2>
      <p className="text-gray-600">
        Purchase equipment using your starting gold. Choose wisely - your equipment can mean
        the difference between life and death.
      </p>

      {/* Starting Gold Display */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="font-bold text-yellow-800">
          Starting Gold: {gold} gp
        </p>
        <p className="text-yellow-700 text-sm">
          Based on your class: {className}
        </p>
      </div>

      {/* Equipment Categories */}
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Weapons</h3>
          <p className="text-gray-500 text-sm">
            Weapons, ammunition, and ranged weapons coming soon.
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Armor</h3>
          <p className="text-gray-500 text-sm">
            Armor and shields coming soon.
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Tools & Gear</h3>
          <p className="text-gray-500 text-sm">
            Adventuring gear, tools, and miscellaneous items coming soon.
          </p>
        </div>
      </div>

      {/* Preview placeholder */}
      <div className="bg-gray-100 p-4 rounded-lg text-center">
        <p className="text-gray-500">
          Full equipment selection with item categories, prices, and shopping cart
          functionality coming soon.
        </p>
      </div>
    </div>
  )
}
