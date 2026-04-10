import React from 'react'
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

const AppShell: React.FC = () => {
  const { snapshot, connected, error } = useSensors()
  useAppSettings() // apply persisted settings (poll interval etc.) to service on startup

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
