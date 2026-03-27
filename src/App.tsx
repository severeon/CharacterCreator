import { Routes, Route, Navigate } from 'react-router'

function Placeholder({ label }: { label: string }) {
  return <div className="p-8 text-xl">{label} — coming in Task 5</div>
}

export default function App() {
  return (
    <div className="flex h-screen">
      <nav className="w-48 bg-gray-900 text-white p-4">
        <h1 className="text-lg font-bold mb-4">Content Browser</h1>
        <ul className="space-y-2">
          <li><a href="/races">Races</a></li>
          <li><a href="/classes">Classes</a></li>
          <li><a href="/feats">Feats</a></li>
          <li><a href="/spells">Spells</a></li>
        </ul>
      </nav>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/races" replace />} />
          <Route path="/:entityType" element={<Placeholder label="Entity List" />} />
          <Route path="/:entityType/:id" element={<Placeholder label="Entity Detail" />} />
        </Routes>
      </main>
    </div>
  )
}
