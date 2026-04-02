import { SkillsStep } from './SkillsStep'

interface SkillAllocatorProps {
  config: { skills_ref: string }
  abilities: Record<string, number>
  skillAllocations: Record<string, number>
  classSkillNames: string[]
  skillPointsRemaining: number
  onAllocateSkill: (skill: string, delta: number) => void
}

export function SkillAllocator({
  abilities,
  skillAllocations,
  classSkillNames,
  skillPointsRemaining,
  onAllocateSkill,
}: SkillAllocatorProps) {
  return (
    <SkillsStep
      abilities={abilities}
      skillAllocations={skillAllocations}
      classSkillNames={classSkillNames}
      skillPointsRemaining={skillPointsRemaining}
      onAllocateSkill={onAllocateSkill}
      onContinue={() => {}}
      onBack={() => {}}
    />
  )
}
