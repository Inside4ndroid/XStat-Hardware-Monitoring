import React from 'react'
import {
  Box,
  Typography,
  Chip,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material'
import ThermostatIcon from '@mui/icons-material/Thermostat'
import SpeedIcon from '@mui/icons-material/Speed'
import PercentIcon from '@mui/icons-material/Percent'
import BoltIcon from '@mui/icons-material/Bolt'
import PowerIcon from '@mui/icons-material/Power'
import AirIcon from '@mui/icons-material/Air'
import MemoryIcon from '@mui/icons-material/Memory'
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck'
import type { SensorReading } from '@/types/sensors'

interface SensorCardProps {
  sensor: SensorReading
}

function getSensorIcon(type: string) {
  switch (type) {
    case 'Temperature': return <ThermostatIcon fontSize="small" />
    case 'Clock':       return <SpeedIcon fontSize="small" />
    case 'Load':
    case 'Control':
    case 'Level':       return <PercentIcon fontSize="small" />
    case 'Voltage':     return <BoltIcon fontSize="small" />
    case 'Power':       return <PowerIcon fontSize="small" />
    case 'Fan':         return <AirIcon fontSize="small" />
    case 'Data':
    case 'SmallData':   return <MemoryIcon fontSize="small" />
    case 'Throughput':  return <NetworkCheckIcon fontSize="small" />
    default:            return null
  }
}

function getValueColor(
  type: string,
  value: number | null,
  theme: ReturnType<typeof useTheme>
): string {
  if (value === null) return theme.palette.text.disabled
  if (type === 'Temperature') {
    if (value >= 90) return theme.palette.error.main
    if (value >= 70) return theme.palette.warning.main
    if (value >= 50) return theme.palette.info.main
    return theme.palette.success.main
  }
  if (type === 'Load' || type === 'Control') {
    if (value >= 90) return theme.palette.error.main
    if (value >= 70) return theme.palette.warning.main
    return theme.palette.primary.main
  }
  return theme.palette.primary.main
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—'
  const rounded =
    unit === 'MHz' || unit === 'RPM'
      ? Math.round(value)
      : value % 1 === 0
      ? value
      : value.toFixed(1)
  return `${rounded} ${unit}`
}

export const SensorCard: React.FC<SensorCardProps> = ({ sensor }) => {
  const theme = useTheme()
  const valueColor = getValueColor(sensor.type, sensor.value, theme)
  const icon = getSensorIcon(sensor.type)

  return (
    <Tooltip title={sensor.hardwareName} placement="top" arrow>
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          background: alpha(theme.palette.background.paper, 0.6),
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          minWidth: 140,
          transition: 'border-color 0.2s',
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.4),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          {icon}
          <Typography variant="caption" noWrap sx={{ lineHeight: 1.2 }}>
            {sensor.name}
          </Typography>
        </Box>
        <Typography
          variant="h6"
          sx={{ color: valueColor, fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}
        >
          {formatValue(sensor.value, sensor.unit)}
        </Typography>
      </Box>
    </Tooltip>
  )
}
