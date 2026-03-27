import type { Value } from '../lib/types'

function renderValue(value: Value): string {
  if (value === null) return '\u2014'
  if (typeof value === 'object' && Array.isArray(value)) return value.map(renderValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

interface Props {
  properties: Record<string, Value>
  exclude?: string[]
}

export default function PropertyTable({ properties, exclude = ['name'] }: Props) {
  const entries = Object.entries(properties).filter(([key]) => !exclude.includes(key))

  return (
    <table className="w-full text-sm">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="border-b border-gray-200">
            <td className="py-1 pr-4 font-medium text-gray-600 capitalize">{key}</td>
            <td className="py-1">{renderValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
