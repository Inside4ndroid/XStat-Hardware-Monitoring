import { useState, useEffect } from 'react'
import type { PanelLayout, PanelWidget, LayoutItem, WidgetType } from '@/types/panel'
import { WIDGET_DEFAULTS } from '@/types/panel'

export const STORAGE_KEY = 'xstat:panels:v4'
const SERVICE_BASE = 'http://localhost:9421'

export const CUSTOM_DEFAULT_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  /*
   * ─── STYLES ──────────────────────────────────────────────────────────────
   * This is regular CSS. You can change colours, fonts, sizes — anything here
   * controls how your widget looks.
   */

  /* Remove default browser spacing from all elements */
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /*
   * The widget fills its container. "background: transparent" lets the panel
   * background or image show through behind your widget.
   * The flex layout centres your content both horizontally and vertically.
   */
  body {
    background: transparent;
    overflow: hidden;
    font-family: Inter, system-ui, sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }

  /* Small grey label shown above the value (e.g. "CPU Package") */
  #label { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 6px; }

  /* The big number in the middle — change the color to whatever you like */
  #value { font-size: 36px; font-weight: 700; color: #03dac6; }

  /* The unit shown after the number (e.g. "°C", "%", "MHz") */
  #unit  { font-size: 15px; color: rgba(255,255,255,0.5); margin-left: 4px; }
</style></head><body>

  <!--
    ─── HTML ──────────────────────────────────────────────────────────────────
    This is the visible structure of your widget.
    The three elements below are updated automatically by the script further down.
    You can rename the ids (label / value / unit) as long as you update the
    matching getElementById calls in the <script> section too.
  -->
  <div id="label">CPU Package</div>
  <div><span id="value">--</span><span id="unit">°C</span></div>

  <script>
    /*
     * ─── SCRIPT ────────────────────────────────────────────────────────────
     * XStat sends live sensor data to this widget via window.postMessage
     * every time it reads your hardware (by default every 1 second).
     *
     * You don't need to fetch anything yourself — just listen for the message
     * event below and pull the values you want out of the sensors array.
     *
     * Each sensor object looks like this:
     * {
     *   id:           "unique/path/to/sensor",   ← internal hardware path
     *   name:         "CPU Package",              ← use this to find the sensor
     *   category:     "CPU",                      ← hardware category
     *   type:         "Temperature",              ← sensor type (Load, Fan, etc.)
     *   value:        42.3,                       ← current reading (null if unavailable)
     *   unit:         "°C",                       ← unit string
     *   hardwareName: "AMD Ryzen 9 5900X"         ← the hardware it belongs to
     * }
     *
     * TIP: Open the Sensors list (button at the top of this editor) to browse
     * every available sensor name on your system and click to copy it.
     */
    window.addEventListener('message', function(e) {
      var sensors = e.data && e.data.sensors;
      if (!sensors) return; // ignore unrelated messages

      // Find the sensor whose name matches — change 'CPU Package' to any name
      // from the Sensors list to display a different reading.
      var s = sensors.find(function(x) { return x.name === 'CPU Package'; });

      if (s) {
        // toFixed(1) shows one decimal place — use toFixed(0) for whole numbers
        document.getElementById('value').textContent = s.value != null ? s.value.toFixed(1) : '--';
        document.getElementById('unit').textContent  = s.unit || '';
        document.getElementById('label').textContent = s.name;
      }
    });
  </script>
</body></html>`

/** Push layout to the service, retrying a few times on failure (handles startup race). */
export async function pushLayoutToService(layout: PanelLayout, retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${SERVICE_BASE}/api/panel-layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout),
      })
      if (r.ok || r.status === 204) return
    } catch { /* not running yet */ }
    await new Promise(r => setTimeout(r, 800 * (i + 1)))
  }
}

export interface PanelsState {
  panels: PanelLayout[]
  activePanelId: string
}

function makeDefaultPanel(): PanelLayout {
  return {
    id: 'default',
    name: 'My Panel',
    canvasWidth: 800,
    canvasHeight: 600,
    canvasBackground: '#0d0d10',
    canvasShowGrid: true,
    widgets: [],
    layout: [],
  }
}

function makeDefaultWidget(type: WidgetType): PanelWidget {
  const base: PanelWidget = { id: crypto.randomUUID(), type }
  switch (type) {
    case 'SensorBar':
    case 'SensorGauge':
      return { ...base, min: 0, max: 100, color: '#7c6ef5' }
    case 'SensorValue':
    case 'SensorSparkline':
      return { ...base, color: '#03dac6' }
    case 'Clock':
      return { ...base, color: '#ffffff', clockFormat: '24h', showDate: false, showSeconds: true }
    case 'Text':
      return { ...base, color: '#ffffff', text: 'Label', textAlign: 'left', fontWeight: 'normal' }
    case 'Custom':
      return { ...base, customHtml: CUSTOM_DEFAULT_HTML }
    case 'Image':
      return { ...base, imageObjectFit: 'contain', imageOpacity: 1 }
  }
}

function loadState(): PanelsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PanelsState
      if (Array.isArray(parsed.panels) && parsed.panels.length > 0) return parsed
    }
  } catch { /* ignore */ }
  const def = makeDefaultPanel()
  return { panels: [def], activePanelId: def.id }
}

export function usePanelLayout() {
  const [state, setState] = useState<PanelsState>(loadState)

  // Persist on every state change, and push the active panel to the local service
  // so the LAN web panel can display it.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    const active = state.panels.find(p => p.id === state.activePanelId) ?? state.panels[0]
    pushLayoutToService(active)
  }, [state])

  const activePanel =
    state.panels.find(p => p.id === state.activePanelId) ?? state.panels[0]

  // ── Layout ────────────────────────────────────────────────────────────────
  function updateLayout(layout: LayoutItem[]) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id ? { ...p, layout } : p
      ),
    }))
  }

  // ── Widgets ───────────────────────────────────────────────────────────────
  function addWidget(type: WidgetType): string {
    const widget = makeDefaultWidget(type)
    const { w, h } = WIDGET_DEFAULTS[type]
    // Stagger new widgets so they don't all pile on top of each other
    const n = activePanel.layout.length
    const x = 10 + (n % 8) * 20
    const y = 10 + (n % 8) * 20
    const item: LayoutItem = { i: widget.id, x, y, w, h }

    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id
          ? { ...p, widgets: [...p.widgets, widget], layout: [...p.layout, item] }
          : p
      ),
    }))
    return widget.id
  }

  function updateWidget(widgetId: string, updates: Partial<PanelWidget>) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id
          ? { ...p, widgets: p.widgets.map(w => w.id === widgetId ? { ...w, ...updates } : w) }
          : p
      ),
    }))
  }

  function removeWidget(widgetId: string) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id
          ? {
              ...p,
              widgets: p.widgets.filter(w => w.id !== widgetId),
              layout: p.layout.filter(l => l.i !== widgetId),
            }
          : p
      ),
    }))
  }

  function updateWidgetGeometry(widgetId: string, geom: Partial<Omit<LayoutItem, 'i'>>) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id
          ? { ...p, layout: p.layout.map(l => l.i === widgetId ? { ...l, ...geom } : l) }
          : p
      ),
    }))
  }

  // ── Panels ────────────────────────────────────────────────────────────────
  function createPanel(name: string) {
    const panel = { ...makeDefaultPanel(), id: crypto.randomUUID(), name }
    setState(s => ({ panels: [...s.panels, panel], activePanelId: panel.id }))
  }

  function deletePanel(id: string) {
    setState(s => {
      const remaining = s.panels.filter(p => p.id !== id)
      // Always keep at least one panel
      if (remaining.length === 0) {
        const def = makeDefaultPanel()
        return { panels: [def], activePanelId: def.id }
      }
      const newActive = s.activePanelId === id ? remaining[0].id : s.activePanelId
      return { panels: remaining, activePanelId: newActive }
    })
  }

  function renamePanel(name: string) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id ? { ...p, name } : p
      ),
    }))
  }

  function setActivePanel(id: string) {
    setState(s => ({ ...s, activePanelId: id }))
  }

  function updateCanvasBackground(color: string) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id ? { ...p, canvasBackground: color } : p
      ),
    }))
  }

  function updateCanvasSettings(updates: { canvasBackground?: string; canvasBackgroundImage?: string | null; canvasShowGrid?: boolean; canvasGridColor?: string }) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id ? { ...p, ...updates } : p
      ),
    }))
  }

  function updateCanvasSize(canvasWidth: number, canvasHeight: number) {
    setState(s => ({
      ...s,
      panels: s.panels.map(p =>
        p.id === activePanel.id ? { ...p, canvasWidth, canvasHeight } : p
      ),
    }))
  }

  // ── Import / Export ───────────────────────────────────────────────────────
  function exportPanel(): string {
    return JSON.stringify(activePanel, null, 2)
  }

  function importPanel(json: string): boolean {
    try {
      const panel = JSON.parse(json) as PanelLayout
      if (!panel.name || !Array.isArray(panel.widgets)) return false
      panel.id = crypto.randomUUID()
      // Migrate older exports that may lack canvas dimensions
      panel.canvasWidth  = panel.canvasWidth  ?? 800
      panel.canvasHeight = panel.canvasHeight ?? 600
      panel.canvasShowGrid = panel.canvasShowGrid ?? true
      setState(s => ({ panels: [...s.panels, panel], activePanelId: panel.id }))
      return true
    } catch {
      return false
    }
  }

  return {
    panels: state.panels,
    activePanel,
    updateLayout,
    addWidget,
    updateWidget,
    removeWidget,
    updateWidgetGeometry,
    createPanel,
    deletePanel,
    renamePanel,
    setActivePanel,
    updateCanvasBackground,
    updateCanvasSettings,
    updateCanvasSize,
    exportPanel,
    importPanel,
  }
}
