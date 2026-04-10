import React, { useRef, useEffect } from 'react'
import { Box, alpha, useTheme } from '@mui/material'
import type { PanelLayout, LayoutItem } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'
import type { HistoryPoint } from '@/hooks/useSensorHistory'
import { WidgetRenderer } from './WidgetRenderer'

type Dir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

const MIN_SIZE = 10
const HANDLE_PX = 8

interface DragHandle { dir: Dir; style: React.CSSProperties }
const HANDLES: DragHandle[] = [
  { dir: 'nw', style: { top: -4,       left: -4,                                      cursor: 'nw-resize' } },
  { dir: 'n',  style: { top: -4,       left: '50%', transform: 'translateX(-50%)',    cursor: 'n-resize'  } },
  { dir: 'ne', style: { top: -4,       right: -4,                                     cursor: 'ne-resize' } },
  { dir: 'e',  style: { top: '50%',    transform: 'translateY(-50%)', right: -4,      cursor: 'e-resize'  } },
  { dir: 'se', style: { bottom: -4,    right: -4,                                     cursor: 'se-resize' } },
  { dir: 's',  style: { bottom: -4,    left: '50%', transform: 'translateX(-50%)',    cursor: 's-resize'  } },
  { dir: 'sw', style: { bottom: -4,    left: -4,                                       cursor: 'sw-resize' } },
  { dir: 'w',  style: { top: '50%',    transform: 'translateY(-50%)', left: -4,       cursor: 'w-resize'  } },
]

interface ActiveOp {
  kind: 'move' | 'resize'
  id: string
  dir?: Dir
  mx0: number; my0: number
  ox: number;  oy: number
  ow: number;  oh: number
}

interface Props {
  panel: PanelLayout
  snapshot: HardwareSnapshot | null
  history: Map<string, HistoryPoint[]>
  isEditMode: boolean
  snapToGrid?: boolean
  selectedWidgetId: string | null
  onSelect: (id: string | null) => void
  onWidgetGeometry: (id: string, geom: Partial<Omit<LayoutItem, 'i'>>) => void
  onPanStart?: (e: React.MouseEvent) => void
  onCanvasSelect?: () => void
}

export const PanelCanvas: React.FC<Props> = ({
  panel,
  snapshot,
  history,
  isEditMode,
  snapToGrid,
  selectedWidgetId,
  onSelect,
  onWidgetGeometry,
  onPanStart,
  onCanvasSelect,
}) => {
  const theme = useTheme()

  // Stable refs so event listeners don't need to be re-attached on every render
  const opRef    = useRef<ActiveOp | null>(null)
  const layoutRef = useRef(panel.layout)
  const geoRef    = useRef(onWidgetGeometry)
  const snapRef   = useRef(snapToGrid)
  useEffect(() => { layoutRef.current = panel.layout },   [panel.layout])
  useEffect(() => { geoRef.current    = onWidgetGeometry }, [onWidgetGeometry])
  useEffect(() => { snapRef.current   = snapToGrid },       [snapToGrid])

  // Attach global mouse handlers once; read latest state via refs
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const op = opRef.current
      if (!op) return

      const dx = e.clientX - op.mx0
      const dy = e.clientY - op.my0
      let x = op.ox, y = op.oy, w = op.ow, h = op.oh

      if (op.kind === 'move') {
        x = op.ox + dx
        y = op.oy + dy
      } else {
        switch (op.dir) {
          case 'e':  w = Math.max(MIN_SIZE, op.ow + dx); break
          case 's':  h = Math.max(MIN_SIZE, op.oh + dy); break
          case 'se': w = Math.max(MIN_SIZE, op.ow + dx); h = Math.max(MIN_SIZE, op.oh + dy); break
          case 'n': { const cd = Math.min(dy, op.oh - MIN_SIZE); y = op.oy + cd; h = op.oh - cd; break }
          case 'w': { const cd = Math.min(dx, op.ow - MIN_SIZE); x = op.ox + cd; w = op.ow - cd; break }
          case 'ne': {
            w = Math.max(MIN_SIZE, op.ow + dx)
            const cd = Math.min(dy, op.oh - MIN_SIZE); y = op.oy + cd; h = op.oh - cd; break
          }
          case 'sw': {
            const cd = Math.min(dx, op.ow - MIN_SIZE); x = op.ox + cd; w = op.ow - cd
            h = Math.max(MIN_SIZE, op.oh + dy); break
          }
          case 'nw': {
            const cdx = Math.min(dx, op.ow - MIN_SIZE); x = op.ox + cdx; w = op.ow - cdx
            const cdy = Math.min(dy, op.oh - MIN_SIZE); y = op.oy + cdy; h = op.oh - cdy; break
          }
        }
      }

      // Update DOM directly — no React re-render during drag = buttery smooth
      // Snap to grid if enabled
      if (snapRef.current) {
        const G = 20
        const s = (v: number) => Math.round(v / G) * G
        if (op.kind === 'move') {
          x = s(x); y = s(y)
        } else {
          const fRight  = op.ox + op.ow
          const fBottom = op.oy + op.oh
          switch (op.dir) {
            case 'e':  { const r = s(x + w); w = Math.max(G, r - x); break }
            case 's':  { const b = s(y + h); h = Math.max(G, b - y); break }
            case 'se': { const r = s(x + w); w = Math.max(G, r - x); const b = s(y + h); h = Math.max(G, b - y); break }
            case 'n':  { y = s(y); h = Math.max(G, fBottom - y); break }
            case 'w':  { x = s(x); w = Math.max(G, fRight  - x); break }
            case 'ne': { y = s(y); h = Math.max(G, fBottom - y); const r2 = s(x + w); w = Math.max(G, r2 - x); break }
            case 'sw': { x = s(x); w = Math.max(G, fRight - x); const b2 = s(y + h); h = Math.max(G, b2 - y); break }
            case 'nw': { x = s(x); y = s(y); w = Math.max(G, fRight - x); h = Math.max(G, fBottom - y); break }
          }
        }
      }

      const el = document.getElementById(`xw-${op.id}`)
      if (el) {
        el.style.left   = `${x}px`
        el.style.top    = `${y}px`
        el.style.width  = `${w}px`
        el.style.height = `${h}px`
      }
    }

    function onMouseUp() {
      const op = opRef.current
      if (!op) return
      opRef.current = null
      document.body.style.cursor = ''

      // Only commit if the drag actually moved (inline styles were written).
      // A plain click never sets el.style.left, so el.style.left is '' — skip commit.
      const el = document.getElementById(`xw-${op.id}`)
      if (el && el.style.left !== '') {
        const x = parseFloat(el.style.left)   || 0
        const y = parseFloat(el.style.top)    || 0
        const w = parseFloat(el.style.width)  || MIN_SIZE
        const h = parseFloat(el.style.height) || MIN_SIZE
        el.style.removeProperty('left')
        el.style.removeProperty('top')
        el.style.removeProperty('width')
        el.style.removeProperty('height')
        geoRef.current(op.id, { x, y, w, h })
      }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup',   onMouseUp)
    }
  }, []) // empty deps — stable via refs

  function startMove(e: React.MouseEvent, widgetId: string) {
    e.stopPropagation()
    e.preventDefault()
    const item = layoutRef.current.find(l => l.i === widgetId)
    if (!item) return
    document.body.style.cursor = 'grabbing'
    opRef.current = {
      kind: 'move', id: widgetId,
      mx0: e.clientX, my0: e.clientY,
      ox: item.x, oy: item.y, ow: item.w, oh: item.h,
    }
  }

  function startResize(e: React.MouseEvent, widgetId: string, dir: Dir) {
    e.stopPropagation()
    e.preventDefault()
    const item = layoutRef.current.find(l => l.i === widgetId)
    if (!item) return
    document.body.style.cursor = `${dir}-resize`
    opRef.current = {
      kind: 'resize', id: widgetId, dir,
      mx0: e.clientX, my0: e.clientY,
      ox: item.x, oy: item.y, ow: item.w, oh: item.h,
    }
  }

  return (
    <Box
      onClick={e => { if (e.target === e.currentTarget) onSelect(null) }}
      onMouseDown={e => { if (e.button === 0 && e.target === e.currentTarget) onPanStart?.(e) }}
      onContextMenu={e => { if (e.target === e.currentTarget) { e.preventDefault(); onCanvasSelect?.() } }}
      sx={{
        position: 'relative',
        width: panel.canvasWidth,
        height: panel.canvasHeight,
        flexShrink: 0,
        // Background: image takes precedence over solid color
        background: panel.canvasBackground,
        ...(panel.canvasBackgroundImage && {
          backgroundImage: `url("${panel.canvasBackgroundImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }),
        overflow: 'visible',
        userSelect: 'none',
        // Dot-grid overlay
        ...(isEditMode && panel.canvasShowGrid && {
          backgroundImage: panel.canvasBackgroundImage
            ? `radial-gradient(circle, ${alpha(panel.canvasGridColor ?? '#ffffff', 0.20)} 1px, transparent 1px), url("${panel.canvasBackgroundImage}")`
            : `radial-gradient(circle, ${alpha(panel.canvasGridColor ?? '#ffffff', 0.20)} 1px, transparent 1px)`,
          backgroundSize: panel.canvasBackgroundImage
            ? '20px 20px, cover'
            : '20px 20px',
          backgroundPosition: panel.canvasBackgroundImage
            ? 'top left, center'
            : 'top left',
          backgroundRepeat: panel.canvasBackgroundImage
            ? 'repeat, no-repeat'
            : 'repeat',
        }),
        ...(isEditMode && { outline: `1px solid ${alpha('#ffffff', 0.08)}` }),
      }}
    >
      {panel.widgets.map(widget => {
        const item     = panel.layout.find(l => l.i === widget.id)
        if (!item) return null
        const selected = selectedWidgetId === widget.id

        return (
          <Box
            key={widget.id}
            id={`xw-${widget.id}`}
            sx={{
              position: 'absolute',
              left:   item.x,
              top:    item.y,
              width:  item.w,
              height: item.h,
              zIndex: widget.zIndex ?? 0,
              overflow: 'hidden',
              cursor: isEditMode ? 'grab' : 'default',
              // Selection / hover outlines
              outline: isEditMode
                ? selected
                  ? `2px solid ${theme.palette.primary.main}`
                  : `1px dashed ${alpha('#ffffff', 0.13)}`
                : 'none',
              outlineOffset: selected ? 1 : 0,
              '&:hover': isEditMode && !selected
                ? { outline: `1px dashed ${alpha(theme.palette.primary.main, 0.55)}` }
                : {},
            }}
          >
            <WidgetRenderer widget={widget} snapshot={snapshot} history={history} />

            {/* Transparent overlay in edit mode — left-click drags, right-click selects */}
            {isEditMode && (
              <Box
                onMouseDown={e => {
                  if (e.button === 0) startMove(e, widget.id)
                }}
                onContextMenu={e => {
                  e.preventDefault()
                  onSelect(widget.id)
                }}
                sx={{
                  position: 'absolute', inset: 0,
                  zIndex: 5,
                  cursor: 'grab',
                }}
              />
            )}

            {/* 8-direction resize handles — visible only on selected widget */}
            {isEditMode && selected && HANDLES.map(({ dir, style }) => (
              <Box
                key={dir}
                component="div"
                onMouseDown={e => startResize(e, widget.id, dir)}
                sx={{
                  position: 'absolute',
                  width:  HANDLE_PX,
                  height: HANDLE_PX,
                  background: theme.palette.primary.main,
                  border: `1.5px solid ${theme.palette.background.paper}`,
                  borderRadius: '2px',
                  zIndex: 10,
                  ...style,
                  '&:hover': { background: theme.palette.primary.light },
                }}
              />
            ))}


          </Box>
        )
      })}
    </Box>
  )
}
