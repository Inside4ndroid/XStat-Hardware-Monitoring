import React from 'react'
import { Box, Typography, Card, CardContent, Divider, useTheme } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import { GaugeBar, StatTile } from '@/components/Primitives'
import { filterSensors } from '@/hooks/useSensorHistory'
import type { SensorReading } from '@/types/sensors'

interface StoragePanelProps {
  sensors: SensorReading[]
}

export const StoragePanel: React.FC<StoragePanelProps> = ({ sensors }) => {
  const theme = useTheme()
  const storeSensors = sensors.filter(s => s.category === 'Storage')
  if (storeSensors.length === 0) return null

  // Group by drive
  const driveMap = new Map<string, SensorReading[]>()
  for (const s of storeSensors) {
    if (!driveMap.has(s.hardwareName)) driveMap.set(s.hardwareName, [])
    driveMap.get(s.hardwareName)!.push(s)
  }

  const accent = '#e07b54'  // orange for storage

  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color: accent, display: 'flex' }}><StorageIcon /></Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Storage</Typography>
        </Box>

        {[...driveMap.entries()].map(([driveName, driveSensors], idx) => {
          const temp      = driveSensors.find(s => s.type === 'Temperature')
          const usedSpace = driveSensors.find(s => s.type === 'Load' && s.name.toLowerCase().includes('used space'))
          const readRate  = driveSensors.find(s => s.type === 'Throughput' && s.name.toLowerCase().includes('read'))
          const writeRate = driveSensors.find(s => s.type === 'Throughput' && s.name.toLowerCase().includes('write'))
          const lifeLeft  = driveSensors.find(s => s.name.toLowerCase().includes('remaining life'))
              ?? driveSensors.find(s => s.name.toLowerCase().includes('life'))

          const tempColor = (temp?.value ?? 0) >= 60 ? theme.palette.error.main
                          : (temp?.value ?? 0) >= 45 ? theme.palette.warning.main
                          : theme.palette.success.main

          return (
            <Box key={driveName}>
              {idx > 0 && <Divider sx={{ my: 1.5, opacity: 0.4 }} />}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                  {driveName}
                </Typography>
                {temp && (
                  <Typography variant="caption" sx={{ color: tempColor, fontWeight: 700, flexShrink: 0 }}>
                    {temp.value?.toFixed(0)}°C
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {temp && <StatTile label="Temp"  value={temp.value}     unit="°C"  color={tempColor} />}
                {readRate  && <StatTile label="Read"  value={readRate.value}  unit={readRate.unit}   color={theme.palette.success.main} />}
                {writeRate && <StatTile label="Write" value={writeRate.value} unit={writeRate.unit}  color={accent} />}
                {lifeLeft  && <StatTile label="Life"  value={lifeLeft.value}  unit="%"              color={theme.palette.info.main} />}
              </Box>

              {usedSpace && (
                <GaugeBar
                  label="Used space"
                  value={usedSpace.value}
                  unit="%"
                  color={accent}
                  height={6}
                />
              )}
            </Box>
          )
        })}
      </CardContent>
    </Card>
  )
}
