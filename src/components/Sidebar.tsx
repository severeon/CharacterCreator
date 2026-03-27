import { NavLink } from 'react-router'

const ENTITY_TYPES = [
  { type: 'races', label: 'Races' },
  { type: 'classes', label: 'Classes' },
  { type: 'feats', label: 'Feats' },
  { type: 'spells', label: 'Spells' },
]

export default function Sidebar() {
  return (
    <nav className="w-48 shrink-0 bg-gray-900 text-white p-4">
      <h1 className="text-lg font-bold mb-4">Content Browser</h1>
      <ul className="space-y-2">
        {ENTITY_TYPES.map(({ type, label }) => (
          <li key={type}>
            <NavLink
              to={`/${type}`}
              className={({ isActive }) =>
                isActive ? 'text-amber-400 font-semibold' : 'text-gray-300 hover:text-white'
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
