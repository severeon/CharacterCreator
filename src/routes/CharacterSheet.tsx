import { useParams, Link } from 'react-router'
import { useEffect, useState } from 'react'
import { getEntityById, exportCharacterJson, exportCharacterMarkdown } from '../lib/engine'
import type { Entity } from '../lib/types'
import { LayoutRenderer } from '../components/LayoutRenderer'
import { useLayout } from '../hooks/useLayout'

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const layout = useLayout('srd:layout:character-sheet')

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

  const name = typeof character.properties.name === 'string'
    ? character.properties.name
    : 'Unnamed Character'
  const race = typeof character.properties.race_name === 'string'
    ? character.properties.race_name
    : typeof character.properties.race === 'string' ? character.properties.race : ''
  const className = typeof character.properties.class_name === 'string'
    ? character.properties.class_name
    : typeof character.properties.class === 'string' ? character.properties.class : ''
  const level = typeof character.properties.level === 'number' ? character.properties.level : 1
  const alignment = typeof character.properties.alignment === 'string' ? character.properties.alignment : ''

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-gray-400">
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
            className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            New Character
          </Link>
        </div>
      </div>

      {layout ? (
        <LayoutRenderer layout={layout} character={character} />
      ) : (
        <p className="text-gray-500">No layout available.</p>
      )}
    </div>
  )
}
