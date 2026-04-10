import React from 'react'
import { Box, Typography, Card, CardContent, useTheme } from '@mui/material'
import RamIcon from '@mui/icons-material/DeveloperBoard'
import { GaugeBar, Sparkline, StatTile } from '@/components/Primitives'
import { findSensor } from '@/hooks/useSensorHistory'
import type { SensorReading } from '@/types/sensors'
import type { HistoryPoint } from '@/hooks/useSensorHistory'

interface RAMPanelProps {
  sensors: SensorReading[]
  history: Map<string, HistoryPoint[]>
}

export const RAMPanel: React.FC<RAMPanelProps> = ({ sensors, history }) => {
  const theme = useTheme()
  const ramSensors = sensors.filter(s => s.category === 'RAM')
  if (ramSensors.length === 0) return null

  const memLoad  = findSensor(ramSensors, 'RAM', 'Load', 'Memory')
  const memUsed  = findSensor(ramSensors, 'RAM', 'Data', 'Used Memory')
      ?? findSensor(ramSensors, 'RAM', 'Data', 'Memory Used')
  const memAvail = findSensor(ramSensors, 'RAM', 'Data', 'Available Memory')
      ?? findSensor(ramSensors, 'RAM', 'Data', 'Memory Available')
  const memTotal = findSensor(ramSensors, 'RAM', 'Data', 'Virtual Memory Committed')
      ?? findSensor(ramSensors, 'RAM', 'Data', 'Memory')

  const loadHistory = memLoad ? (history.get(memLoad.id) ?? []) : []
  const accent = '#9c8af5' // soft purple for RAM

  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color: accent, display: 'flex' }}><RamIcon /></Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Memory</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <StatTile label="Usage"      value={memLoad?.value ?? null} unit="%" color={accent} />
          <StatTile label="Used"       value={memUsed?.value ?? null} unit={memUsed?.unit ?? 'GB'} color={accent} />
          <StatTile label="Available"  value={memAvail?.value ?? null} unit={memAvail?.unit ?? 'GB'} color={theme.palette.success.main} />
        </Box>

        {memLoad && (
          <GaugeBar label="Memory usage" value={memLoad.value} unit="%" color={accent} height={7} />
        )}

        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Usage (60s)
          </Typography>
          <Sparkline data={loadHistory} color={accent} height={44} unit="%" />
        </Box>
      </CardContent>
    </Card>
  )
}
