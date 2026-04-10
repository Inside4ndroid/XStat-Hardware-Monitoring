import React, { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import type { PanelWidget } from '@/types/panel'

interface Props {
  widget: PanelWidget
}

const DATE_FORMAT_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
  numeric: { month: 'numeric', day: 'numeric', year: 'numeric' },
  short:   { month: 'short',   day: 'numeric', year: 'numeric' },
  long:    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  full:    { weekday: 'long',  month: 'long',  day: 'numeric', year: 'numeric' },
  day:     { weekday: 'long' },
}

export const ClockWidget: React.FC<Props> = ({ widget }) => {
  const [now, setNow] = useState(() => new Date())

  // Time styling
  const showTime      = widget.showTime    ?? true
  const is24h         = widget.clockFormat !== '12h'
  const showSeconds   = widget.showSeconds ?? true
  const showAmPm      = widget.showAmPm    ?? true
  const timeColor     = widget.color       ?? '#ffffff'
  const timeFontSize  = widget.fontSize    ?? 28
  const timeBold      = widget.timeBold    ?? true
  const timeFontFamily = widget.fontFamily ?? undefined
  const timeItalic    = widget.italic      ?? false

  // Date styling
  const showDate       = widget.showDate      ?? false
  const dateFormat     = widget.dateFormat    ?? 'long'
  const dateColor      = widget.dateColor     ?? 'rgba(255,255,255,0.45)'
  const dateFontSize   = widget.dateFontSize  ?? 11
  const dateBold       = widget.dateBold      ?? false
  const dateFontFamily = widget.dateFontFamily ?? undefined
  const dateItalic     = widget.dateItalic    ?? false

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const rawH    = now.getHours()
  const h       = is24h ? rawH.toString().padStart(2, '0') : ((rawH % 12) || 12).toString().padStart(2, '0')
  const m       = now.getMinutes().toString().padStart(2, '0')
  const s       = now.getSeconds().toString().padStart(2, '0')
  const ampm    = (is24h || !showAmPm) ? '' : (rawH < 12 ? ' AM' : ' PM')
  const timeStr = showSeconds ? `${h}:${m}:${s}${ampm}` : `${h}:${m}${ampm}`
  const dateStr = now.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS[dateFormat] ?? DATE_FORMAT_OPTIONS.long)

  return (
    <Box
      sx={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', px: 1,
      }}
    >
      {showTime && (
        <Typography
          sx={{
            fontSize: timeFontSize,
            fontWeight: timeBold ? 700 : 400,
            color: timeColor,
            letterSpacing: '0.03em', fontVariantNumeric: 'tabular-nums',
            lineHeight: 1, userSelect: 'none',
            fontFamily: timeFontFamily,
            fontStyle: timeItalic ? 'italic' : 'normal',
          }}
        >
          {timeStr}
        </Typography>
      )}
      {showDate && (
        <Typography
          sx={{
            fontSize: dateFontSize,
            fontWeight: dateBold ? 700 : 400,
            color: dateColor,
            mt: showTime ? 0.75 : 0,
            userSelect: 'none',
            fontFamily: dateFontFamily,
            fontStyle: dateItalic ? 'italic' : 'normal',
          }}
        >
          {dateStr}
        </Typography>
      )}
    </Box>
  )
}
