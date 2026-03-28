import { useParams, Link } from 'react-router'
import { useEffect, useState } from 'react'
import { getEntityById, exportCharacterJson, exportCharacterMarkdown } from '../lib/engine'
import type { Entity } from '../lib/types'

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadCharacter()
    }
  }, [id])

  async function loadCharacter() {
    if (!id) return
    setLoading(true)
    try {
      const entity = await getEntityById(id)
      setCharacter(entity)
    } catch (err) {
      console.error('Failed to load character:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportJson() {
    if (!id) return
    try {
      const json = await exportCharacterJson(id)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${character?.properties.name || 'character'}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export JSON:', err)
    }
  }

  async function handleExportMarkdown() {
    if (!id) return
    try {
      const md = await exportCharacterMarkdown(id)
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${character?.properties.name || 'character'}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export Markdown:', err)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading character...</p>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="p-8">
        <p>Character not found.</p>
        <Link to="/creation" className="text-blue-600 hover:underline mt-4 inline-block">
          Create a new character
        </Link>
      </div>
    )
  }

  const getPropertyString = (key: string, fallback: string = ''): string => {
    const val = character.properties[key]
    if (val === null || val === undefined) return fallback
    if (typeof val === 'string') return val
    if (typeof val === 'number') return val.toString()
    return fallback
  }

  const getPropertyNumber = (key: string, fallback: number = 0): number => {
    const val = character.properties[key]
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseInt(val, 10) || fallback
    return fallback
  }

  const getNestedProperty = (path: string, fallback: number = 10): number => {
    const val = character.properties[path]
    if (typeof val === 'number') return val
    if (typeof val === 'string') return parseInt(val, 10) || fallback
    return fallback
  }

  const name = getPropertyString('name', 'Unnamed Character')
  const race = getPropertyString('race_name') || getPropertyString('race', 'No race')
  const className = getPropertyString('class_name') || getPropertyString('class', 'No class')
  const level = getPropertyNumber('level', 1)

  // Ability scores
  const str = getNestedProperty('abilities.strength.score')
  const dex = getNestedProperty('abilities.dexterity.score')
  const con = getNestedProperty('abilities.constitution.score')
  const int = getNestedProperty('abilities.intelligence.score')
  const wis = getNestedProperty('abilities.wisdom.score')
  const cha = getNestedProperty('abilities.charisma.score')

  const mod = (score: number) => Math.floor((score - 10) / 2)
  const fmtMod = (score: number) => (mod(score) >= 0 ? '+' : '') + mod(score)

  // Derived stats
  const hd = getPropertyNumber('hit_die', 8)
  const conMod = mod(con)
  const hp = hd + conMod

  // Skills
  const skills: { name: string; ranks: number }[] = []
  Object.entries(character.properties).forEach(([key, val]) => {
    if (key.startsWith('skills.') && key.endsWith('.ranks') && typeof val === 'number') {
      const skillName = key.replace('skills.', '').replace('.ranks', '')
      skills.push({ name: skillName, ranks: val })
    }
  })

  // Feats
  const featsSelected = character.properties['feats_selected']
  const feats: string[] = Array.isArray(featsSelected)
    ? featsSelected.map(f => String(f))
    : []

  // Identity fields
  const alignment = getPropertyString('alignment', '')
  const deity = getPropertyString('deity', '')
  const age = getPropertyString('age', '')
  const height = getPropertyString('height', '')
  const weight = getPropertyString('weight', '')
  const eyes = getPropertyString('eyes', '')
  const hair = getPropertyString('hair', '')
  const skin = getPropertyString('skin', '')
  const appearance = getPropertyString('appearance', '')
  const background = getPropertyString('background', '')

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-gray-600">
            {race} {className} {level > 1 ? `Level ${level}` : ''}
            {alignment ? ` | ${alignment}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportJson}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportMarkdown}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export Markdown
          </button>
          <Link
            to="/creation"
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            New Character
          </Link>
        </div>
      </div>

      {/* Identity Section */}
      {(deity || age || height || weight || appearance || background) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Character Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {deity && <div><span className="text-gray-500">Deity:</span> {deity}</div>}
            {age && <div><span className="text-gray-500">Age:</span> {age}</div>}
            {height && <div><span className="text-gray-500">Height:</span> {height}"</div>}
            {weight && <div><span className="text-gray-500">Weight:</span> {weight} lbs</div>}
            {eyes && <div><span className="text-gray-500">Eyes:</span> {eyes}</div>}
            {hair && <div><span className="text-gray-500">Hair:</span> {hair}</div>}
            {skin && <div><span className="text-gray-500">Skin:</span> {skin}</div>}
          </div>
          {appearance && (
            <div className="mt-4">
              <span className="text-gray-500 text-sm block mb-1">Appearance:</span>
              <p className="text-sm">{appearance}</p>
            </div>
          )}
          {background && (
            <div className="mt-4">
              <span className="text-gray-500 text-sm block mb-1">Background:</span>
              <p className="text-sm">{background}</p>
            </div>
          )}
        </div>
      )}

      {/* Combat Stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Combat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <span className="text-sm text-gray-500 block">Hit Points</span>
            <span className="text-3xl font-bold text-red-600">{hp}</span>
            <span className="text-sm text-gray-500 block">HP (d{hd})</span>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <span className="text-sm text-gray-500 block">Base Attack</span>
            <span className="text-3xl font-bold text-blue-600">+{Math.floor(hd / 2) + 1}</span>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <span className="text-sm text-gray-500 block">Initiative</span>
            <span className={`text-3xl font-bold ${mod(dex) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtMod(dex)}
            </span>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <span className="text-sm text-gray-500 block">Armor Class</span>
            <span className="text-3xl font-bold">10 + {mod(dex)}</span>
            <span className="text-xs text-gray-500 block">Touch: {10 + mod(dex)}</span>
          </div>
        </div>
      </div>

      {/* Ability Scores */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Ability Scores</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { label: 'Strength', value: str, key: 'str' },
            { label: 'Dexterity', value: dex, key: 'dex' },
            { label: 'Constitution', value: con, key: 'con' },
            { label: 'Intelligence', value: int, key: 'int' },
            { label: 'Wisdom', value: wis, key: 'wis' },
            { label: 'Charisma', value: cha, key: 'cha' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">{label.slice(0, 3)}</p>
              <p className="text-2xl font-bold">{value}</p>
              <p className={`text-sm ${mod(value) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmtMod(value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          Skills {skills.length > 0 && <span className="text-sm font-normal text-gray-500">({skills.length} allocated)</span>}
        </h2>
        {skills.length === 0 ? (
          <p className="text-gray-400 italic">No skills allocated</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {skills
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(({ name, ranks }) => (
                <div key={name} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                  <span>{name}</span>
                  <span className="font-medium">{ranks} ranks</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Feats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          Feats {feats.length > 0 && <span className="text-sm font-normal text-gray-500">({feats.length})</span>}
        </h2>
        {feats.length === 0 ? (
          <p className="text-gray-400 italic">No feats selected</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {feats.map((feat, i) => (
              <li key={i} className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                {feat}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notes */}
      {character.mdx_body && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-2">Notes</h2>
          <div className="prose text-sm" dangerouslySetInnerHTML={{ __html: character.mdx_body }} />
        </div>
      )}
    </div>
  )
}
