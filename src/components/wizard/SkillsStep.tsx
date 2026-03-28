import { ALL_SKILLS } from '../../lib/dnd35/skills'

interface SkillsStepProps {
  abilities: Record<string, number>
  skillAllocations: Record<string, number>
  classSkillNames: string[]
  skillPointsRemaining: number
  onAllocateSkill: (skill: string, delta: number) => void
  onContinue: () => void
  onBack: () => void
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function SkillsStep({
  abilities,
  skillAllocations,
  classSkillNames,
  skillPointsRemaining,
  onAllocateSkill,
  onContinue,
  onBack,
}: SkillsStepProps) {
  const level = 1

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Allocate Skill Points</h2>
      <p className="text-gray-600">
        <strong>{skillPointsRemaining}</strong> skill points remaining
      </p>
      <div className="max-h-96 overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Skill</th>
              <th className="px-3 py-2 text-left font-semibold">Key</th>
              <th className="px-3 py-2 text-center font-semibold">Ranks</th>
              <th className="px-3 py-2 text-center font-semibold">Cost</th>
              <th className="px-3 py-2 text-center font-semibold">Allocate</th>
            </tr>
          </thead>
          <tbody>
            {ALL_SKILLS.map((skill) => {
              const isClassSkill = classSkillNames.some(
                (cs) => cs.toLowerCase() === skill.name.toLowerCase()
              )
              const cost = isClassSkill ? 1 : 2
              const maxRanks = isClassSkill ? level : Math.floor(level / 2)
              const currentRanks = skillAllocations[skill.name] || 0
              const abilityKey = skill.ability.toLowerCase()
              const abilityMod = abilities[abilityKey] ?? 10
              const modValue = abilityModifier(abilityMod)
              const totalBonus = currentRanks + modValue

              return (
                <tr key={skill.name} className="border-t">
                  <td className="px-3 py-1.5">
                    <span className={isClassSkill ? 'font-medium' : 'text-gray-500'}>
                      {skill.name}
                    </span>
                    {isClassSkill && (
                      <span className="ml-1 text-xs text-green-600 font-medium">Class</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{skill.ability}</td>
                  <td className="px-3 py-1.5 text-center">
                    {currentRanks > 0 ? (
                      <span>
                        <span className="font-bold">{currentRanks}</span>
                        <span className="text-gray-400">
                          +{modValue >= 0 ? modValue : modValue} = {totalBonus >= 0 ? '+' : ''}
                          {totalBonus}
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">{modValue >= 0 ? '+' : ''}{modValue}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-500">{cost}</td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onAllocateSkill(skill.name, -1)}
                        disabled={currentRanks <= 0}
                        className="w-7 h-7 rounded border text-center font-bold disabled:opacity-30 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-medium">{currentRanks}</span>
                      <button
                        onClick={() => onAllocateSkill(skill.name, 1)}
                        disabled={currentRanks >= maxRanks || skillPointsRemaining < cost}
                        className="w-7 h-7 rounded border text-center font-bold disabled:opacity-30 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4">
        <button onClick={onBack} className="px-6 py-2 border rounded-lg">
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
