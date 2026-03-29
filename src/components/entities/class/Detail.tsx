import type { Entity } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'
import { isObject } from '../shared'

interface Props {
  entity: Entity
}

export default function ClassDetail({ entity }: Props) {
  const hd = getPropertyNumber(entity.properties, 'hd', 0)
  const bab = getPropertyString(entity.properties, 'bab', '')
  const skillPoints = getPropertyNumber(entity.properties, 'skillPoints', 0)
  const subtype = getPropertyString(entity.properties, 'subtype', '')
  const entryRequirements = getPropertyString(entity.properties, 'entryRequirements', '')

  const savesRaw = entity.properties.saves
  const saves = isObject(savesRaw) ? savesRaw : null
  const fort = saves !== null ? getPropertyString(saves, 'fort', '') : ''
  const ref = saves !== null ? getPropertyString(saves, 'ref', '') : ''
  const will = saves !== null ? getPropertyString(saves, 'will', '') : ''

  const classSkillsRaw = entity.properties.classSkills
  const classSkills = Array.isArray(classSkillsRaw)
    ? classSkillsRaw.filter((v): v is string => typeof v === 'string')
    : []

  const specialAbilitiesRaw = entity.properties.specialAbilities
  const specialAbilities = Array.isArray(specialAbilitiesRaw)
    ? specialAbilitiesRaw.filter((v): v is string => typeof v === 'string')
    : []

  const bonusFeatsRaw = entity.properties.bonusFeats
  const bonusFeats = Array.isArray(bonusFeatsRaw)
    ? bonusFeatsRaw.filter((v): v is number => typeof v === 'number')
    : []

  const variantsRaw = entity.properties.variants
  const variants = Array.isArray(variantsRaw)
    ? variantsRaw.flatMap((v) => {
        if (isObject(v) && typeof v.name === 'string') return [v.name]
        return []
      })
    : []

  const hasStats = hd > 0 || bab !== '' || skillPoints > 0
  const hasSaves = fort !== '' || ref !== '' || will !== ''
  const fmtSave = (s: string) => (s === 'good' ? 'Good' : s === 'poor' ? 'Poor' : s)

  return (
    <div className="space-y-4">
      {hasStats && (
        <section>
          <div className="flex gap-6 text-sm text-gray-800">
            {hd > 0 && (
              <div>
                <span className="font-semibold text-gray-600">HD</span>{' '}
                <span>d{hd}</span>
              </div>
            )}
            {bab !== '' && (
              <div>
                <span className="font-semibold text-gray-600">BAB</span>{' '}
                <span className="capitalize">{bab}</span>
              </div>
            )}
            {skillPoints > 0 && (
              <div>
                <span className="font-semibold text-gray-600">Skill Points/Level</span>{' '}
                <span>{skillPoints}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {hasSaves && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-1">Saves</h3>
          <div className="flex gap-4 text-sm text-gray-800">
            {fort !== '' && (
              <span><span className="font-medium">Fort:</span> {fmtSave(fort)}</span>
            )}
            {ref !== '' && (
              <span><span className="font-medium">Ref:</span> {fmtSave(ref)}</span>
            )}
            {will !== '' && (
              <span><span className="font-medium">Will:</span> {fmtSave(will)}</span>
            )}
          </div>
        </section>
      )}

      {classSkills.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-1">Class Skills</h3>
          <p className="text-sm text-gray-800">{classSkills.join(', ')}</p>
        </section>
      )}

      {specialAbilities.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-1">Special Abilities</h3>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-0.5">
            {specialAbilities.map((ability) => (
              <li key={ability}>{ability}</li>
            ))}
          </ul>
        </section>
      )}

      {bonusFeats.length > 0 && (
        <section>
          <p className="text-sm text-gray-800">
            <span className="font-semibold text-gray-700">Bonus feats at levels:</span>{' '}
            {bonusFeats.join(', ')}
          </p>
        </section>
      )}

      {variants.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-1">Variants</h3>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-0.5">
            {variants.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </section>
      )}

      {subtype === 'prestige' && entryRequirements !== '' && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-1">Entry Requirements</h3>
          <p className="text-sm text-gray-800">{entryRequirements}</p>
        </section>
      )}
    </div>
  )
}
