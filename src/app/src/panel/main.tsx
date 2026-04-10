import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { xstatTheme } from '@/theme/theme'
import { PanelApp } from './PanelApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={xstatTheme}>
      <CssBaseline />
      <PanelApp />
    </ThemeProvider>
  </React.StrictMode>,
)
