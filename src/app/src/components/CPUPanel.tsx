import React from 'react'
import { Box, Typography, Card, CardContent, Divider, alpha, useTheme } from '@mui/material'
import MemoryIcon from '@mui/icons-material/Memory'
import { GaugeBar, Sparkline, StatTile } from '@/components/Primitives'
import { filterSensors, findSensor } from '@/hooks/useSensorHistory'
import type { SensorReading } from '@/types/sensors'
import type { HistoryPoint } from '@/hooks/useSensorHistory'

interface CPUPanelProps {
  sensors: SensorReading[]
  history: Map<string, HistoryPoint[]>
}

export const CPUPanel: React.FC<CPUPanelProps> = ({ sensors, history }) => {
  const theme = useTheme()

  // Key stats
  const totalLoad   = findSensor(sensors, 'CPU', 'Load', 'CPU Total')
      ?? findSensor(sensors, 'CPU', 'Load', 'Total')
  const pkgTemp     = findSensor(sensors, 'CPU', 'Temperature', 'CPU Package')
      ?? findSensor(sensors, 'CPU', 'Temperature', 'Package')
      ?? findSensor(sensors, 'CPU', 'Temperature', 'Core (Tctl')
      ?? sensors.find(s => s.category === 'CPU' && s.type === 'Temperature')
  const pkgPower    = findSensor(sensors, 'CPU', 'Power', 'CPU Package')
      ?? findSensor(sensors, 'CPU', 'Power', 'Package')
      ?? sensors.find(s => s.category === 'CPU' && s.type === 'Power')
  const maxClock    = sensors
    .filter(s => s.category === 'CPU' && s.type === 'Clock' && s.value !== null)
    .reduce<SensorReading | null>((a, b) => (!a || (b.value ?? 0) > (a.value ?? 0)) ? b : a, null)

  // Per-core loads
  const coreLoads = filterSensors(sensors, 'CPU', 'Load')
    .filter(s => s.name.toLowerCase().includes('core') || s.name.match(/cpu core #\d/i))

  // Per-core temps
  const coreTemps = filterSensors(sensors, 'CPU', 'Temperature')
    .filter(s => s.name.match(/core #?\d/i))

  const accent = theme.palette.info.main  // blue for CPU by convention

  const totalLoadHistory = totalLoad ? (history.get(totalLoad.id) ?? []) : []
  const pkgTempHistory   = pkgTemp   ? (history.get(pkgTemp.id)   ?? []) : []

  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color: accent, display: 'flex' }}>
            <MemoryIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>CPU</Typography>
          {pkgTemp && (
            <Typography variant="body2" sx={{
              color: (pkgTemp.value ?? 0) >= 90 ? 'error.main'
                   : (pkgTemp.value ?? 0) >= 70 ? 'warning.main' : 'success.main',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}>
              {pkgTemp.value?.toFixed(0)}°C
            </Typography>
          )}
        </Box>

        {/* Key stat tiles */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <StatTile label="Load"  value={totalLoad?.value ?? null}  unit="%" color={accent} />
          <StatTile label="Temp"  value={pkgTemp?.value ?? null}    unit="°C"
            color={
              (pkgTemp?.value ?? 0) >= 90 ? theme.palette.error.main :
              (pkgTemp?.value ?? 0) >= 70 ? theme.palette.warning.main :
              theme.palette.success.main
            }
          />
          <StatTile label="Power" value={pkgPower?.value ?? null}   unit="W"  color={theme.palette.warning.main} />
          <StatTile label="Clock" value={maxClock ? (maxClock.value ?? null) : null} unit="MHz" color={theme.palette.secondary.main} />
        </Box>

        {/* Sparklines */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Load (60s)
            </Typography>
            <Sparkline data={totalLoadHistory} color={accent} height={44} unit="%" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Temp (60s)
            </Typography>
            <Sparkline data={pkgTempHistory} color={theme.palette.success.main} height={44} unit="°C" />
          </Box>
        </Box>

        {/* Per-core load bars */}
        {coreLoads.length > 0 && (
          <>
            <Divider sx={{ mb: 1.5, opacity: 0.4 }} />
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
              Per-Core Load
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 0.75,
              }}
            >
              {coreLoads.map((s) => (
                <GaugeBar
                  key={s.id}
                  label={s.name}
                  value={s.value}
                  unit="%"
                  color={accent}
                  height={5}
                />
              ))}
            </Box>
          </>
        )}

        {/* Per-core temps */}
        {coreTemps.length > 0 && (
          <>
            <Divider sx={{ mb: 1.5, mt: 1.5, opacity: 0.4 }} />
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
              Per-Core Temp
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 0.75,
              }}
            >
              {coreTemps.map((s) => {
                const tempColor = (s.value ?? 0) >= 90 ? theme.palette.error.main
                                : (s.value ?? 0) >= 70 ? theme.palette.warning.main
                                : theme.palette.success.main
                return (
                  <GaugeBar
                    key={s.id}
                    label={s.name}
                    value={s.value}
                    max={105}
                    unit="°C"
                    color={tempColor}
                    height={5}
                  />
                )
              })}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  )
}
