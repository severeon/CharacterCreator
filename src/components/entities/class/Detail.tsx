import type { Entity } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'
import { isObject } from '../shared'
import { DetailSection, KeyValue, BulletList } from '../../ui'

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
        <div className="flex gap-6 text-sm">
          {hd > 0 && <KeyValue label="HD" value={`d${hd}`} layout="inline" />}
          {bab !== '' && (
            <KeyValue label="BAB" value={<span className="capitalize">{bab}</span>} layout="inline" />
          )}
          {skillPoints > 0 && (
            <KeyValue label="Skill Points/Level" value={skillPoints} layout="inline" />
          )}
        </div>
      )}

      {hasSaves && (
        <DetailSection title="Saves" spacing="tight">
          <div className="flex gap-4">
            {fort !== '' && <KeyValue label="Fort" value={fmtSave(fort)} layout="inline" />}
            {ref !== '' && <KeyValue label="Ref" value={fmtSave(ref)} layout="inline" />}
            {will !== '' && <KeyValue label="Will" value={fmtSave(will)} layout="inline" />}
          </div>
        </DetailSection>
      )}

      {classSkills.length > 0 && (
        <DetailSection title="Class Skills" spacing="tight">
          <p className="text-sm text-gray-800">{classSkills.join(', ')}</p>
        </DetailSection>
      )}

      {specialAbilities.length > 0 && (
        <DetailSection title="Special Abilities" spacing="tight">
          <BulletList items={specialAbilities} spacing="tight" />
        </DetailSection>
      )}

      {bonusFeats.length > 0 && (
        <KeyValue label="Bonus feats at levels" value={bonusFeats.join(', ')} layout="inline" />
      )}

      {variants.length > 0 && (
        <DetailSection title="Variants" spacing="tight">
          <BulletList items={variants} spacing="tight" />
        </DetailSection>
      )}

      {subtype === 'prestige' && entryRequirements !== '' && (
        <DetailSection title="Entry Requirements" spacing="tight">
          <p className="text-sm text-gray-800">{entryRequirements}</p>
        </DetailSection>
      )}
    </div>
  )
}
