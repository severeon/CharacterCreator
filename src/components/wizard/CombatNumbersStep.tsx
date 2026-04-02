import type { Entity } from '../../lib/types'
import { babTable } from '../reference/babTable'

interface CombatNumbersStepProps {
  characterId: string | null
  abilities: Record<string, number>
  selectedClass: Entity | null
  selectedRace: Entity | null
  onContinue: () => void
  onBack: () => void
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function CombatNumbersStep({
  abilities,
  selectedClass
}: CombatNumbersStepProps) {
  const strMod = abilityModifier(abilities.strength || 10)
  const dexMod = abilityModifier(abilities.dexterity || 10)
  const conMod = abilityModifier(abilities.constitution || 10)
  const intMod = abilityModifier(abilities.intelligence || 10)
  const wisMod = abilityModifier(abilities.wisdom || 10)
  const chaMod = abilityModifier(abilities.charisma || 10)

  const classData = selectedClass?.properties ?? {}
  const hd = (classData['hd'] as number) ?? 8
  const bab = ((classData['bab'] as string) ?? 'medium').toLowerCase()
  const fortBase = (classData['fort'] as number) ?? 0
  const refBase = (classData['ref'] as number) ?? 0
  const willBase = (classData['will'] as number) ?? 0

  const currentBAB = (babTable[bab] ?? babTable.medium)[0]
  const hp = hd + conMod
  const initiative = dexMod
  const ac = 10 + dexMod
  const flatFooted = 10 + dexMod
  const touch = 10 + dexMod

  // Combat maneuver bonus (approximation)
  const CMB = currentBAB + strMod

  // Grapple (approximation)
  const grapple = currentBAB + strMod

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Step 10: Record Combat Numbers</h2>
      <p className="text-gray-600">
        These numbers define your combat capabilities. Review them carefully.
      </p>

      {/* Combat Numbers Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Hit Points */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <span className="text-red-600 block font-medium">Hit Points</span>
          <span className="text-3xl font-bold text-red-700">{hp}</span>
          <span className="text-red-500 text-xs block">HD: d{hd}</span>
        </div>

        {/* Base Attack Bonus */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <span className="text-blue-600 block font-medium">Base Attack</span>
          <span className="text-3xl font-bold text-blue-700">+{currentBAB}</span>
          <span className="text-blue-500 text-xs block">BAB</span>
        </div>

        {/* Initiative */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <span className="text-green-600 block font-medium">Initiative</span>
          <span className={`text-3xl font-bold ${initiative >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {initiative >= 0 ? '+' : ''}{initiative}
          </span>
          <span className="text-green-500 text-xs block">DEX mod</span>
        </div>

        {/* Armor Class */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <span className="text-purple-600 block font-medium">Armor Class</span>
          <span className="text-3xl font-bold text-purple-700">{ac}</span>
          <span className="text-purple-500 text-xs block">
            Touch: {touch} / Flat: {flatFooted}
          </span>
        </div>

        {/* Fortitude Save */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <span className="text-yellow-600 block font-medium">Fortitude Save</span>
          <span className={`text-3xl font-bold ${fortBase + conMod >= 0 ? 'text-yellow-700' : 'text-red-700'}`}>
            +{fortBase + conMod}
          </span>
          <span className="text-yellow-500 text-xs block">Base + CON</span>
        </div>

        {/* Reflex Save */}
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <span className="text-teal-600 block font-medium">Reflex Save</span>
          <span className={`text-3xl font-bold ${refBase + dexMod >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
            +{refBase + dexMod}
          </span>
          <span className="text-teal-500 text-xs block">Base + DEX</span>
        </div>

        {/* Will Save */}
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <span className="text-indigo-600 block font-medium">Will Save</span>
          <span className={`text-3xl font-bold ${willBase + wisMod >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
            +{willBase + wisMod}
          </span>
          <span className="text-indigo-500 text-xs block">Base + WIS</span>
        </div>

        {/* Speed */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <span className="text-gray-600 block font-medium">Speed</span>
          <span className="text-3xl font-bold text-gray-700">30 ft</span>
          <span className="text-gray-500 text-xs block">Base</span>
        </div>

        {/* Combat Maneuver Bonus */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <span className="text-orange-600 block font-medium">CMB</span>
          <span className={`text-3xl font-bold ${CMB >= 0 ? 'text-orange-700' : 'text-red-700'}`}>
            {CMB >= 0 ? '+' : ''}{CMB}
          </span>
          <span className="text-orange-500 text-xs block">BAB + STR</span>
        </div>

        {/* Grapple */}
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
          <span className="text-rose-600 block font-medium">Grapple</span>
          <span className={`text-3xl font-bold ${grapple >= 0 ? 'text-rose-700' : 'text-red-700'}`}>
            {grapple >= 0 ? '+' : ''}{grapple}
          </span>
          <span className="text-rose-500 text-xs block">CMB</span>
        </div>
      </div>

      {/* Ability Modifiers Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Ability Modifiers</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
          <span>STR: {strMod >= 0 ? '+' : ''}{strMod}</span>
          <span>DEX: {dexMod >= 0 ? '+' : ''}{dexMod}</span>
          <span>CON: {conMod >= 0 ? '+' : ''}{conMod}</span>
          <span>INT: {intMod >= 0 ? '+' : ''}{intMod}</span>
          <span>WIS: {wisMod >= 0 ? '+' : ''}{wisMod}</span>
          <span>CHA: {chaMod >= 0 ? '+' : ''}{chaMod}</span>
        </div>
      </div>
    </div>
  )
}
