import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import Sidebar from './components/Sidebar'
import EntityList from './routes/EntityList'
import EntityDetail from './routes/EntityDetail'
import CreationWizard from './routes/CreationWizard'
import CharacterSheet from './routes/CharacterSheet'
import DMTools from './components/DMTools'
import { isTauri } from './lib/isTauri'
import ComponentPlayground from './routes/ComponentPlayground'
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--parchment-light)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
      }}>
        <Routes>
          <Route path="/" element={<Navigate to="/races" replace />} />
          <Route path="/creation" element={<CreationWizard />} />
          <Route path="/character/:id" element={<CharacterSheet />} />
          <Route path="/:entityType" element={<EntityList />} />
          <Route path="/:entityType/:id" element={<EntityDetail />} />
          {!isTauri() && (
            <Route path="/dev/components/:name" element={<ComponentPlayground />} />
          )}
        </Routes>
      </main>
      <DMTools isOpen={dmToolsOpen} onToggle={() => setDmToolsOpen(!dmToolsOpen)} />
    </div>
  )
}
