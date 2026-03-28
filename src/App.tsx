import { Routes, Route, Navigate } from 'react-router'
import Sidebar from './components/Sidebar'
import EntityList from './routes/EntityList'
import EntityDetail from './routes/EntityDetail'
import CreationWizard from './routes/CreationWizard'
import CharacterSheet from './routes/CharacterSheet'

export default function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/races" replace />} />
          <Route path="/creation" element={<CreationWizard />} />
          <Route path="/character/:id" element={<CharacterSheet />} />
          <Route path="/:entityType" element={<EntityList />} />
          <Route path="/:entityType/:id" element={<EntityDetail />} />
        </Routes>
      </main>
    </div>
  )
}
