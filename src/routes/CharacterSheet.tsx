import { useParams, Link } from 'react-router'
import { useEffect, useState } from 'react'
import { getEntityById } from '../lib/engine'
import type { Entity } from '../lib/types'

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<Entity | null>(null)

  useEffect(() => {
    if (id) {
      loadCharacter()
    }
  }, [id])

  async function loadCharacter() {
    if (!id) return
    const entity = await getEntityById(id)
    setCharacter(entity)
  }

  if (!character) {
    return (
      <div className="p-8">
        <p>Loading character...</p>
      </div>
    )
  }

  const getPropertyString = (key: string, fallback: string = '') => {
    const val = character.properties[key]
    if (val === null || val === undefined) return fallback
    if (typeof val === 'string') return val
    if (typeof val === 'number') return val.toString()
    return fallback
  }

  const name = getPropertyString('name', 'Unnamed Character')
  const race = getPropertyString('race_name') || getPropertyString('race', 'No race')
  const str = parseInt(getPropertyString('abilities.strength.score', '10')) || 10
  const dex = parseInt(getPropertyString('abilities.dexterity.score', '10')) || 10
  const con = parseInt(getPropertyString('abilities.constitution.score', '10')) || 10
  const int = parseInt(getPropertyString('abilities.intelligence.score', '10')) || 10
  const wis = parseInt(getPropertyString('abilities.wisdom.score', '10')) || 10
  const cha = parseInt(getPropertyString('abilities.charisma.score', '10')) || 10

  const mod = (score: number) => Math.floor((score - 10) / 2)
  const fmtMod = (score: number) => (mod(score) >= 0 ? '+' : '') + mod(score)

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{name}</h1>
        <Link
          to="/creation"
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          New Character
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-700">Race</h2>
            <p className="text-2xl">{race}</p>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-700">Class</h2>
            <p className="text-2xl">{getPropertyString('class_name', 'No class')}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-700 mb-4">Ability Scores</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: 'Strength', value: str },
              { label: 'Dexterity', value: dex },
              { label: 'Constitution', value: con },
              { label: 'Intelligence', value: int },
              { label: 'Wisdom', value: wis },
              { label: 'Charisma', value: cha },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-gray-600">{fmtMod(value)}</p>
              </div>
            ))}
          </div>
        </div>

        {character.mdx_body && (
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">Notes</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: character.mdx_body }} />
          </div>
        )}
      </div>
    </div>
  )
}
