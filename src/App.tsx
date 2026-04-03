import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import Sidebar from './components/Sidebar'
import EntityList from './routes/EntityList'
import EntityDetail from './routes/EntityDetail'
import CreationWizard from './routes/CreationWizard'
import CharacterSheet from './routes/CharacterSheet'
import DMTools from './components/DMTools'
import { useTheme } from './hooks/useTheme'
import type { Theme } from './lib/types'

// Default theme — future: loaded from active campaign's content pack entity via IPC
const DEFAULT_THEME: Theme = {
  id: 'srd:styling:theme',
  properties: {
    colors: {
      primary: '#1e40af',
      secondary: '#7c3aed',
      accent: '#f59e0b',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      text_muted: '#94a3b8',
      border: '#334155',
    },
    typography: {
      heading_font: 'Cinzel, serif',
      body_font: 'Merriweather, serif',
      mono_font: '"Fira Code", monospace',
    },
    spacing: {
      base_unit: 4,
      component_gap: 16,
      section_gap: 24,
      page_margin: 32,
    },
  },
}

export default function App() {
  const [dmToolsOpen, setDmToolsOpen] = useState(false)
  useTheme(DEFAULT_THEME)

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
      <DMTools isOpen={dmToolsOpen} onToggle={() => setDmToolsOpen(!dmToolsOpen)} />
    </div>
  )
}
