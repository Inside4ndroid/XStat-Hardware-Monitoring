import React from 'react'
import { Box, Typography } from '@mui/material'
import type { PanelWidget } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'

interface Props {
  widget: PanelWidget
  snapshot: HardwareSnapshot | null
}

export const SensorValueWidget: React.FC<Props> = ({ widget, snapshot }) => {
  const sensor = snapshot?.sensors.find(s => s.id === widget.sensorId)
  const displayValue = sensor?.value != null ? sensor.value.toFixed(1) : '—'
  const displayUnit  = widget.unit  ?? sensor?.unit  ?? ''
  const displayLabel = widget.label ?? sensor?.name  ?? 'No sensor'
  const color            = widget.color            ?? '#03dac6'
  const fontSize         = widget.fontSize         ?? 32
  const valueBold        = widget.valueBold        ?? true
  const valueFontFamily  = widget.valueFontFamily  ?? undefined
  const valueItalic      = widget.valueItalic      ?? false
  const labelColor       = widget.labelColor       ?? 'rgba(255,255,255,0.45)'
  const labelFontSize    = widget.labelFontSize    ?? 10
  const labelBold        = widget.labelBold        ?? false
  const labelFontFamily  = widget.labelFontFamily  ?? undefined
  const labelItalic      = widget.labelItalic      ?? false
  const unitColor        = widget.unitColor        ?? 'rgba(255,255,255,0.45)'
  const unitFontSize     = widget.unitFontSize     ?? Math.max(8, Math.round(fontSize * 0.42))
  const unitBold         = widget.unitBold         ?? false
  const unitFontFamily   = widget.unitFontFamily   ?? undefined
  const unitItalic       = widget.unitItalic       ?? false
  const showLabel        = widget.showLabel        ?? true
  const showValue        = widget.showValue        ?? true
  const showUnit         = widget.showUnit         ?? true

  return (
    <Box
      sx={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        px: 1.5, py: 1, gap: 0.25, overflow: 'hidden',
      }}
    >
      {showLabel && (
      <Typography
        sx={{
          fontSize: labelFontSize, color: labelColor,
          fontWeight: labelBold ? 700 : 400,
          fontStyle: labelItalic ? 'italic' : 'normal',
          fontFamily: labelFontFamily,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          lineHeight: 1, userSelect: 'none', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', width: '100%',
        }}
      >
        {displayLabel}
      </Typography>
      )}
      {showValue && (
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography
          sx={{
            fontSize, fontWeight: valueBold ? 700 : 400, color, lineHeight: 1,
            fontStyle: valueItalic ? 'italic' : 'normal',
            fontFamily: valueFontFamily,
            fontVariantNumeric: 'tabular-nums', userSelect: 'none',
          }}
        >
          {displayValue}
        </Typography>
        {showUnit && displayUnit && (
          <Typography
            sx={{
              fontSize: unitFontSize, color: unitColor,
              fontWeight: unitBold ? 700 : 400,
              fontStyle: unitItalic ? 'italic' : 'normal',
              fontFamily: unitFontFamily,
              userSelect: 'none',
            }}
          >
            {displayUnit}
          </Typography>
        )}
      </Box>
      )}
    </Box>
  )
}
