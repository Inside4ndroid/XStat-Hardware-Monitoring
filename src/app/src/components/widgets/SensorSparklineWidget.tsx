import React, { useRef, useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { AreaChart, Area } from 'recharts'
import type { PanelWidget } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'
import type { HistoryPoint } from '@/hooks/useSensorHistory'

interface Props {
  widget: PanelWidget
  snapshot: HardwareSnapshot | null
  history: Map<string, HistoryPoint[]>
}

export const SensorSparklineWidget: React.FC<Props> = ({ widget, snapshot, history }) => {
  const sensor       = snapshot?.sensors.find(s => s.id === widget.sensorId)
  const data         = (widget.sensorId ? history.get(widget.sensorId) : null) ?? []
  const accentColor      = widget.accentColor      ?? widget.color ?? '#03dac6'
  const color            = widget.color            ?? '#03dac6'
  const fontSize         = widget.fontSize         ?? 11
  const labelColor       = widget.labelColor       ?? 'rgba(255,255,255,0.45)'
  const labelFontSize    = widget.labelFontSize    ?? 11
  const labelBold        = widget.labelBold        ?? false
  const labelFontFamily  = widget.labelFontFamily  ?? undefined
  const labelItalic      = widget.labelItalic      ?? false
  const valueBold        = widget.valueBold        ?? true
  const valueFontFamily  = widget.valueFontFamily  ?? undefined
  const valueItalic      = widget.valueItalic      ?? false
  const label            = widget.label ?? sensor?.name ?? 'No sensor'
  const currentValue = sensor?.value != null
    ? `${sensor.value.toFixed(1)} ${widget.unit ?? sensor?.unit ?? ''}`.trim()
    : '—'
  const showLabel = widget.showLabel ?? true
  const showValue = widget.showValue ?? true
  const showAccent = widget.showAccent ?? true
  const effectiveAccent = showAccent ? accentColor : 'transparent'

  // Measure the chart container ourselves so we never pass -1 to AreaChart.
  const chartBoxRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = chartBoxRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setChartSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <Box
      sx={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        px: 1, pt: 0.75, pb: 0.5,
      }}
    >
      <Box
        sx={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', px: 0.5, mb: 0.5,
        }}
      >
        {showLabel && (
        <Typography
          sx={{
            fontSize: labelFontSize, color: labelColor,
            fontWeight: labelBold ? 700 : 400,
            fontStyle: labelItalic ? 'italic' : 'normal',
            fontFamily: labelFontFamily,
            userSelect: 'none', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}
        >
          {label}
        </Typography>
        )}
        {showValue && (
        <Typography
          sx={{
            fontSize, color, fontWeight: valueBold ? 700 : 400,
            fontStyle: valueItalic ? 'italic' : 'normal',
            fontFamily: valueFontFamily,
            userSelect: 'none', ml: 1, flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {currentValue}
        </Typography>
        )}
      </Box>
      <Box ref={chartBoxRef} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {chartSize && (
          <AreaChart width={chartSize.w} height={chartSize.h} data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`wsg-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={effectiveAccent} stopOpacity={0.4} />
                <stop offset="95%" stopColor={effectiveAccent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={effectiveAccent}
              strokeWidth={1.5}
              fill={`url(#wsg-${widget.id})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </Box>
    </Box>
  )
}
