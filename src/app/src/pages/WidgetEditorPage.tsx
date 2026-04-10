import React, { useState, useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { CustomWidgetEditor } from '@/components/CustomWidgetEditor'
import { useSensors } from '@/hooks/useSensors'
import type { PanelWidget } from '@/types/panel'

/**
 * Standalone full-window custom widget editor.
 * Loaded at /#/widget-editor in a dedicated frameless BrowserWindow.
 * Widget data is passed in from the main window via IPC.
 */
export const WidgetEditorPage: React.FC = () => {
  const [widget, setWidget] = useState<PanelWidget | null>(null)
  const { snapshot } = useSensors()

  useEffect(() => {
    // Fetch widget data that main process stored when opening this window
    window.xstat.widgetEditor.getData().then(data => {
      if (data) setWidget(data as PanelWidget)
    })

    // Also listen for re-init (if the editor window is already open and user
    // opens another widget — main process sends the new widget data here)
    window.xstat.widgetEditor.onInit(data => {
      setWidget(data as PanelWidget)
    })

    return () => {
      window.xstat.widgetEditor.offInit()
    }
  }, [])

  if (!widget) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f0f11',
      }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  return (
    <CustomWidgetEditor
      open={true}
      standalone={true}
      widget={widget}
      snapshot={snapshot}
      onSave={(html, files) => {
        // Save only — do not close. Main window will update the widget in place.
        window.xstat.widgetEditor.save(html, files)
      }}
      onClose={() => window.xstat.widgetEditor.close()}
    />
  )
}
