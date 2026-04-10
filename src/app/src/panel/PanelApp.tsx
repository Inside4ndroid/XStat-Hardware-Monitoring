import React, { useMemo } from 'react'
import { PanelCanvas }      from '@/components/PanelCanvas'
import { useSensorHistory } from '@/hooks/useSensorHistory'
import { usePanelSensors }  from './usePanelSensors'
import type { PanelLayout } from '@/types/panel'

const EMPTY_PANEL: PanelLayout = {
  id: 'default',
  name: 'Panel',
  canvasWidth: 1280,
  canvasHeight: 720,
  canvasBackground: '#0d0d10',
  canvasShowGrid: false,
  widgets: [],
  layout: [],
}

// Shown when the LAN panel has no widgets configured yet.
const GettingStarted: React.FC<{ loading: boolean }> = ({ loading }) => (
  <div style={{
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0d0d10', fontFamily: 'Inter, system-ui, sans-serif',
  }}>
    <div style={{
      maxWidth: 480, padding: '40px 48px', borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.03)',
      textAlign: 'center', color: '#fff',
    }}>
      {/* icon */}
      <img src="/logo.png" alt="XStat" style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.6 }} />

      <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px' }}>
        {loading ? 'Connecting to XStat…' : 'No panel configured'}
      </p>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
        {loading
          ? 'Waiting for the XStat service to push a panel layout.'
          : 'Open the XStat app on your PC, go to the Panel Designer, add widgets to your panel, and this display will update automatically.'}
      </p>

      {!loading && (
        <ol style={{
          margin: 0, padding: '0 0 0 20px',
          fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 2,
          textAlign: 'left',
        }}>
          <li>Open <strong style={{ color: 'rgba(255,255,255,0.8)' }}>XStat</strong> on your PC</li>
          <li>Navigate to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Panel Designer</strong></li>
          <li>Add at least one widget to the canvas</li>
          <li>This page updates live — no refresh needed</li>
        </ol>
      )}
    </div>
  </div>
)

export const PanelApp: React.FC = () => {
  const { snapshot, layoutJson } = usePanelSensors()
  const history = useSensorHistory(snapshot)

  const panel = useMemo<PanelLayout>(() => {
    if (!layoutJson) return EMPTY_PANEL
    try {
      return JSON.parse(layoutJson) as PanelLayout
    } catch {
      return EMPTY_PANEL
    }
  }, [layoutJson])

  // Show guidance when: still loading (no layoutJson) or panel received but empty
  if (!layoutJson || panel.widgets.length === 0) {
    return <GettingStarted loading={!layoutJson} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: panel.canvasBackground }}>
      <PanelCanvas
        panel={panel}
        snapshot={snapshot}
        history={history}
        isEditMode={false}
        snapToGrid={false}
        selectedWidgetId={null}
        onSelect={() => {}}
        onWidgetGeometry={() => {}}
      />
    </div>
  )
}
