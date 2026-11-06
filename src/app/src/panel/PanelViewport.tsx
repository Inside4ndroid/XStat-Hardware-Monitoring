import React, { useLayoutEffect, useRef, useState } from 'react'
import type { PanelLayout } from '@/types/panel'

// Sanitize only the LAN rendering copy; never change the saved editor layout.
export function preparePanel(panel: PanelLayout) {
  const dimension = (value: number) => Number.isFinite(value) && value > 0 ? value : 0
  const canvasWidth = dimension(panel.canvasWidth)
  const canvasHeight = dimension(panel.canvasHeight)
  let left = 0, top = 0, right = canvasWidth, bottom = canvasHeight
  const layout = panel.widgets.flatMap(widget => {
    // Match PanelCanvas's first layout item for each widget.
    const item = panel.layout.find(item => item.i === widget.id)
    if (!item || ![item.x, item.y, item.w, item.h].every(Number.isFinite)
      || item.w <= 0 || item.h <= 0) return []
    const nextLeft = Math.min(left, item.x)
    const nextTop = Math.min(top, item.y)
    const nextRight = Math.max(right, item.x + item.w)
    const nextBottom = Math.max(bottom, item.y + item.h)
    if (![nextRight, nextBottom, nextRight - nextLeft, nextBottom - nextTop]
      .every(Number.isFinite)) return []
    left = nextLeft; top = nextTop; right = nextRight; bottom = nextBottom
    return [item]
  })
  return {
    panel: { ...panel, canvasWidth, canvasHeight, layout },
    bounds: { left, top, width: right - left, height: bottom - top },
  }
}

interface Props {
  bounds: ReturnType<typeof preparePanel>['bounds']
  background: string
  children: React.ReactNode
}

export function PanelViewport({ bounds, background, children }: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = viewport.current!
    const measure = () => {
      // The untransformed viewport is the only measurement source (CSS pixels).
      const { width, height } = element.getBoundingClientRect()
      setSize(previous => previous.width === width && previous.height === height
        ? previous : { width, height })
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const scale = size.width > 0 && size.height > 0
    ? Math.min(1, bounds.width > 0 ? size.width / bounds.width : 1,
      bounds.height > 0 ? size.height / bounds.height : 1) : 0
  const x = (size.width - bounds.width * scale) / 2 - bounds.left * scale
  const y = (size.height - bounds.height * scale) / 2 - bounds.top * scale

  return (
    <div ref={viewport} data-panel-viewport style={{
      position: 'fixed', inset: 0, overflow: 'hidden', background,
    }}>
      {/* Zero layout footprint: only transformed content contributes overflow.
          The existing viewport clip contains the fitted canvas/widget union. */}
      <div style={{
        position: 'absolute', width: 0, height: 0,
        transformOrigin: '0 0', transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}>
        {children}
      </div>
    </div>
  )
}
