import React from 'react'
import { Box, Typography, Tooltip, alpha, useTheme } from '@mui/material'
import NumbersIcon       from '@mui/icons-material/Numbers'
import LinearScaleIcon   from '@mui/icons-material/LinearScale'
import ShowChartIcon     from '@mui/icons-material/ShowChart'
import SpeedIcon         from '@mui/icons-material/Speed'
import AccessTimeIcon    from '@mui/icons-material/AccessTime'
import TextFieldsIcon    from '@mui/icons-material/TextFields'
import CodeIcon          from '@mui/icons-material/Code'
import ImageIcon         from '@mui/icons-material/Image'
import type { WidgetType } from '@/types/panel'

const ITEMS: {
  type: WidgetType
  label: string
  icon: React.ReactNode
  hint: string
}[] = [
  { type: 'SensorValue',     label: 'Value',     icon: <NumbersIcon sx={{ fontSize: 18 }} />,      hint: 'Large live sensor reading' },
  { type: 'SensorBar',       label: 'Bar',        icon: <LinearScaleIcon sx={{ fontSize: 18 }} />,  hint: 'Progress bar for a sensor' },
  { type: 'SensorSparkline', label: 'Sparkline',  icon: <ShowChartIcon sx={{ fontSize: 18 }} />,    hint: '60-second history chart' },
  { type: 'SensorGauge',     label: 'Gauge',      icon: <SpeedIcon sx={{ fontSize: 18 }} />,        hint: 'Arc gauge for a sensor' },
  { type: 'Clock',           label: 'Clock',      icon: <AccessTimeIcon sx={{ fontSize: 18 }} />,   hint: 'Current time display' },
  { type: 'Text',            label: 'Text',       icon: <TextFieldsIcon sx={{ fontSize: 18 }} />,   hint: 'Static text label' },
  { type: 'Image',           label: 'Image',      icon: <ImageIcon sx={{ fontSize: 18 }} />,         hint: 'Static image with opacity and fit controls' },
  { type: 'Custom',          label: 'Custom',     icon: <CodeIcon sx={{ fontSize: 18 }} />,          hint: 'Your own HTML / CSS / JS widget' },
]

interface Props {
  onAdd: (type: WidgetType) => void
}

export const WidgetPalette: React.FC<Props> = ({ onAdd }) => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', p: 1, gap: 0.25 }}>
      <Typography
        variant="caption"
        sx={{
          px: 0.75, mb: 0.5, color: 'text.disabled',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
          display: 'block',
        }}
      >
        Add Widget
      </Typography>

      {ITEMS.map(({ type, label, icon, hint }) => (
        <Tooltip key={type} title={hint} placement="right" arrow>
          <Box
            onClick={() => onAdd(type)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.25,
              px: 1.25, py: 0.9, borderRadius: 1.5,
              cursor: 'pointer',
              color: 'text.secondary',
              border: '1px solid transparent',
              transition: 'all 0.15s',
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                color: 'primary.light',
              },
              '&:active': {
                background: alpha(theme.palette.primary.main, 0.18),
              },
            }}
          >
            <Box sx={{ display: 'flex', color: 'inherit', flexShrink: 0 }}>
              {icon}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
              {label}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  )
}
