import React from 'react'
import { Box, Typography } from '@mui/material'
import type { PanelWidget } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'

/** Convert polar angle (degrees, 0=top, clockwise) to SVG cartesian */
function polarToXY(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

/** SVG arc path from `from` to `to` degrees (clockwise) */
function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const [sx, sy] = polarToXY(cx, cy, r, from)
  const [ex, ey] = polarToXY(cx, cy, r, to)
  const largeArc = to - from > 180 ? 1 : 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
}

interface Props {
  widget: PanelWidget
  snapshot: HardwareSnapshot | null
}

export const SensorGaugeWidget: React.FC<Props> = ({ widget, snapshot }) => {
  const sensor       = snapshot?.sensors.find(s => s.id === widget.sensorId)
  const value        = sensor?.value ?? 0
  const min          = widget.min ?? 0
  const max          = widget.max ?? 100
  const pct          = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const accentColor      = widget.accentColor      ?? widget.color ?? '#7c6ef5'
  const color            = widget.color            ?? '#7c6ef5'
  const fontSize         = widget.fontSize         ?? 16
  const labelColor       = widget.labelColor       ?? 'rgba(255,255,255,0.4)'
  const labelFontSize    = widget.labelFontSize    ?? 10
  const labelBold        = widget.labelBold        ?? false
  const labelFontFamily  = widget.labelFontFamily  ?? undefined
  const labelItalic      = widget.labelItalic      ?? false
  const valueBold        = widget.valueBold        ?? true
  const valueFontFamily  = widget.valueFontFamily  ?? undefined
  const valueItalic      = widget.valueItalic      ?? false
  const unitColor        = widget.unitColor        ?? 'rgba(255,255,255,0.4)'
  const unitFontSize     = widget.unitFontSize     ?? 8
  const unitBold         = widget.unitBold         ?? false
  const unitFontFamily   = widget.unitFontFamily   ?? undefined
  const unitItalic       = widget.unitItalic       ?? false
  const label            = widget.label ?? sensor?.name ?? 'No sensor'
  const displayValue     = sensor?.value != null ? value.toFixed(1) : '—'
  const displayUnit      = widget.unit ?? sensor?.unit ?? ''
  const showLabel        = widget.showLabel ?? true
  const showValue        = widget.showValue ?? true
  const showUnit         = widget.showUnit  ?? true
  const showAccent       = widget.showAccent ?? true

  // Arc: 135° → 405° (270° sweep), centre slightly below mid for text
  const cx = 50, cy = 54, r = 34, sw = 7
  const startAngle = 135
  const valueAngle = startAngle + pct * 270

  return (
    <Box
      sx={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        px: 0.5, py: 0.5,
      }}
    >
      <Box
        sx={{
          flex: 1, width: '100%', minHeight: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ width: '100%', height: '100%', maxWidth: 160, maxHeight: 160 }}
        >
          {/* Track */}
          <path
            d={arcPath(cx, cy, r, startAngle, startAngle + 270)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={sw}
            strokeLinecap="round"
          />
          {/* Value fill */}
          {showAccent && pct > 0.005 && (
            <path
              d={arcPath(cx, cy, r, startAngle, valueAngle)}
              fill="none"
              stroke={accentColor}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          )}
          {/* Value label */}
          {showValue && (
          <text
            x={cx} y={cy - 2}
            textAnchor="middle" dominantBaseline="middle"
            fill={color} fontSize={fontSize} fontWeight={valueBold ? 'bold' : 'normal'}
            fontStyle={valueItalic ? 'italic' : 'normal'}
            fontFamily={valueFontFamily ?? 'Inter, system-ui, sans-serif'}
          >
            {displayValue}
          </text>
          )}
          {showUnit && displayUnit && (
            <text
              x={cx} y={cy + 11}
              textAnchor="middle" dominantBaseline="middle"
              fill={unitColor} fontSize={unitFontSize} fontWeight={unitBold ? 'bold' : 'normal'}
              fontStyle={unitItalic ? 'italic' : 'normal'}
              fontFamily={unitFontFamily ?? 'Inter, system-ui, sans-serif'}
            >
              {displayUnit}
            </text>
          )}
        </svg>
      </Box>
      {showLabel && (
      <Typography
        sx={{
          fontSize: labelFontSize, color: labelColor,
          fontWeight: labelBold ? 700 : 400,
          fontStyle: labelItalic ? 'italic' : 'normal',
          fontFamily: labelFontFamily,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          pb: 0.5, userSelect: 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {label}
      </Typography>
      )}
    </Box>
  )
}
