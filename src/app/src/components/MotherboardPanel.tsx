import React from 'react'
import { Box, Typography, Card, CardContent, useTheme } from '@mui/material'
import CircuitBoardIcon from '@mui/icons-material/DeveloperBoard'
import { GaugeBar, StatTile } from '@/components/Primitives'
import { filterSensors } from '@/hooks/useSensorHistory'
import type { SensorReading } from '@/types/sensors'

interface MotherboardPanelProps {
  sensors: SensorReading[]
}

export const MotherboardPanel: React.FC<MotherboardPanelProps> = ({ sensors }) => {
  const theme = useTheme()
  // Combine Motherboard + EC + SuperIO sensors
  const mbSensors = sensors.filter(s =>
    s.category === 'Motherboard' || s.category === 'EC'
  )
  if (mbSensors.length === 0) return null

  const temps    = filterSensors(mbSensors, mbSensors[0].category, 'Temperature')
      .concat(filterSensors(mbSensors, 'EC', 'Temperature'))
      .filter(s => s.value !== null && s.value > 0)
  const fans     = mbSensors.filter(s => s.type === 'Fan' && (s.value ?? 0) > 0)
  const voltages = mbSensors.filter(s => s.type === 'Voltage' && s.value !== null)

  if (temps.length === 0 && fans.length === 0) return null

  const accent = '#c77dff'  // purple for motherboard

  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color: accent, display: 'flex' }}><CircuitBoardIcon /></Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Motherboard</Typography>
        </Box>

        {temps.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
              Temperatures
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {temps.slice(0, 8).map(s => {
                const c = (s.value ?? 0) >= 80 ? theme.palette.error.main
                        : (s.value ?? 0) >= 60 ? theme.palette.warning.main
                        : theme.palette.success.main
                return <StatTile key={s.id} label={s.name} value={s.value} unit="°C" color={c} />
              })}
            </Box>
          </>
        )}

        {fans.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
              Fans
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1.5 }}>
              {fans.map(s => (
                <GaugeBar
                  key={s.id}
                  label={s.name}
                  value={s.value}
                  max={3000}
                  unit="RPM"
                  color={accent}
                  height={5}
                />
              ))}
            </Box>
          </>
        )}

        {voltages.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
              Voltages
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {voltages.slice(0, 8).map(s => (
                <StatTile key={s.id} label={s.name} value={s.value} unit="V" color={theme.palette.warning.light} />
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  )
}
