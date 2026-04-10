import React, { useEffect } from 'react'
import { Box, CssBaseline, ThemeProvider } from '@mui/material'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { xstatTheme } from '@/theme/theme'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { PanelEditor } from '@/pages/PanelEditor'
import { Settings } from '@/pages/Settings'
import { WidgetEditorPage } from '@/pages/WidgetEditorPage'
import { useSensors } from '@/hooks/useSensors'
import { useAppSettings } from '@/hooks/useAppSettings'
import { STORAGE_KEY, pushLayoutToService } from '@/hooks/usePanelLayout'
import type { PanelsState } from '@/hooks/usePanelLayout'

const AppShell: React.FC = () => {
  const { snapshot, connected, error } = useSensors()
  useAppSettings() // apply persisted settings (poll interval etc.) to service on startup

  // On every launch, re-push the last active panel so the LAN panel and
  // Android companion show the correct layout without the user having to
  // open the Panel Editor first.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as PanelsState
      if (!Array.isArray(parsed.panels) || parsed.panels.length === 0) return
      const active = parsed.panels.find(p => p.id === parsed.activePanelId) ?? parsed.panels[0]
      pushLayoutToService(active)
    } catch { /* ignore parse errors */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'background.default',
      }}
    >
      <TitleBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard snapshot={snapshot} connected={connected} error={error} />
              }
            />
            <Route
              path="/panel"
              element={
                <PanelEditor snapshot={snapshot} connected={connected} error={error} />
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  )
}

function App() {
  return (
    <ThemeProvider theme={xstatTheme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          {/* Standalone editor window — no AppShell chrome */}
          <Route path="/widget-editor" element={<WidgetEditorPage />} />
          {/* Main app shell */}
          <Route path="*" element={<AppShell />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
