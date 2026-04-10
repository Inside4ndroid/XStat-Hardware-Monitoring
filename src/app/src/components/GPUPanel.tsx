import React from 'react'
import { Box, Typography, Card, CardContent, Divider, useTheme } from '@mui/material'
import VideoSettingsIcon from '@mui/icons-material/VideoSettings'
import { GaugeBar, Sparkline, StatTile } from '@/components/Primitives'
import { filterSensors, findSensor } from '@/hooks/useSensorHistory'
import type { SensorReading } from '@/types/sensors'
import type { HistoryPoint } from '@/hooks/useSensorHistory'

interface GPUPanelProps {
  sensors: SensorReading[]
  history: Map<string, HistoryPoint[]>
}

export const GPUPanel: React.FC<GPUPanelProps> = ({ sensors, history }) => {
  const theme = useTheme()

  const gpuSensors = sensors.filter(s => s.category === 'GPU')
  if (gpuSensors.length === 0) return null

  // Key GPU stats
  const coreLoad   = findSensor(gpuSensors, 'GPU', 'Load', 'GPU Core')
      ?? gpuSensors.find(s => s.type === 'Load')
  const memLoad    = findSensor(gpuSensors, 'GPU', 'Load', 'GPU Memory')
  const gpuTemp    = findSensor(gpuSensors, 'GPU', 'Temperature', 'GPU Core')
      ?? gpuSensors.find(s => s.type === 'Temperature')
  const hotspotTemp = findSensor(gpuSensors, 'GPU', 'Temperature', 'GPU Hot Spot')
  const gpuPower   = findSensor(gpuSensors, 'GPU', 'Power', 'GPU Package')
      ?? findSensor(gpuSensors, 'GPU', 'Power', 'GPU Power')
      ?? gpuSensors.find(s => s.type === 'Power')
  const coreClock  = findSensor(gpuSensors, 'GPU', 'Clock', 'GPU Core')
      ?? gpuSensors.find(s => s.type === 'Clock')
  const memClock   = findSensor(gpuSensors, 'GPU', 'Clock', 'GPU Memory')
  const fanSpeed   = findSensor(gpuSensors, 'GPU', 'Fan', 'GPU Fan')
      ?? gpuSensors.find(s => s.type === 'Fan')

  // VRAM: prefer Data sensors; fallback SmallData / Load
  const vramUsed   = findSensor(gpuSensors, 'GPU', 'SmallData', 'GPU Memory Used')
      ?? findSensor(gpuSensors, 'GPU', 'Data', 'GPU Memory Used')
  const vramTotal  = findSensor(gpuSensors, 'GPU', 'SmallData', 'GPU Memory Total')
      ?? findSensor(gpuSensors, 'GPU', 'Data', 'GPU Memory Total')
  const vramFree   = findSensor(gpuSensors, 'GPU', 'SmallData', 'GPU Memory Free')
      ?? findSensor(gpuSensors, 'GPU', 'Data', 'GPU Memory Free')

  // All load sensors for bottom bars
  const allLoads  = filterSensors(gpuSensors, 'GPU', 'Load')
  const allTemps  = filterSensors(gpuSensors, 'GPU', 'Temperature')
  const allClocks = filterSensors(gpuSensors, 'GPU', 'Clock')

  const coreLoadHistory = coreLoad ? (history.get(coreLoad.id) ?? []) : []
  const gpuTempHistory  = gpuTemp  ? (history.get(gpuTemp.id)  ?? []) : []

  // VRAM utilisation %
  const vramPct = vramUsed && vramTotal && (vramTotal.value ?? 0) > 0
    ? (vramUsed.value! / vramTotal.value!) * 100
    : memLoad?.value ?? null

  const accent = theme.palette.secondary.main  // teal for GPU

  const tempColor = (gpuTemp?.value ?? 0) >= 90 ? theme.palette.error.main
                  : (gpuTemp?.value ?? 0) >= 70 ? theme.palette.warning.main
                  : theme.palette.success.main

  // hardware name from first GPU sensor
  const hwName = gpuSensors[0]?.hardwareName ?? 'GPU'

  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color: accent, display: 'flex' }}>
            <VideoSettingsIcon />
          </Box>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>GPU</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem' }}>
              {hwName}
            </Typography>
          </Box>
          {gpuTemp && (
            <Typography variant="body2" sx={{ color: tempColor, fontWeight: 700, fontSize: '0.95rem' }}>
              {gpuTemp.value?.toFixed(0)}°C
            </Typography>
          )}
        </Box>

        {/* Key stat tiles */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <StatTile label="Core Load" value={coreLoad?.value ?? null}  unit="%" color={accent} />
          <StatTile label="Temp"      value={gpuTemp?.value ?? null}   unit="°C" color={tempColor} />
          {gpuPower?.value != null && (
            <StatTile label="Power"   value={gpuPower.value}           unit="W"  color={theme.palette.warning.main} />
          )}
          <StatTile label="Core Clk"  value={coreClock?.value ?? null} unit="MHz" color={theme.palette.primary.main} />
        </Box>

        {/* Sparklines row */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Load (60s)
            </Typography>
            <Sparkline data={coreLoadHistory} color={accent} height={44} unit="%" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Temp (60s)
            </Typography>
            <Sparkline data={gpuTempHistory} color={tempColor} height={44} unit="°C" />
          </Box>
        </Box>

        {/* VRAM row */}
        {(vramUsed || vramPct !== null) && (
          <>
            <Divider sx={{ mb: 1.5, opacity: 0.4 }} />
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
              VRAM
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {vramUsed && (
                <StatTile
                  label="Used"
                  value={vramUsed.value}
                  unit={vramUsed.unit}
                  color={accent}
                  sub={vramTotal ? `of ${vramTotal.value?.toFixed(0)} ${vramTotal.unit}` : undefined}
                />
              )}
              {vramFree && (
                <StatTile label="Free" value={vramFree.value} unit={vramFree.unit} color={theme.palette.success.main} />
              )}
              {vramPct !== null && (
                <StatTile label="Usage" value={vramPct} unit="%" color={accent} />
              )}
            </Box>
            {vramPct !== null && (
              <GaugeBar
                label="VRAM utilisation"
                value={vramPct}
                unit="%"
                color={accent}
                height={6}
              />
            )}
          </>
        )}

        {/* All load bars */}
        {allLoads.length > 1 && (
          <>
            <Divider sx={{ mb: 1.5, mt: 1.5, opacity: 0.4 }} />
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 1, display: 'block' }}>
              Engines
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {allLoads.map((s) => (
                <GaugeBar key={s.id} label={s.name} value={s.value} unit="%" color={accent} height={5} />
              ))}
            </Box>
          </>
        )}

        {/* Fan + extra clocks */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
          {fanSpeed && (
            <StatTile label="Fan"      value={fanSpeed.value}   unit="RPM" color={theme.palette.info.main} />
          )}
          {memClock && (
            <StatTile label="Mem Clk"  value={memClock.value}   unit="MHz" color={theme.palette.primary.light} />
          )}
          {hotspotTemp && (
            <StatTile label="Hotspot"  value={hotspotTemp.value} unit="°C"
              color={
                (hotspotTemp.value ?? 0) >= 100 ? theme.palette.error.main :
                (hotspotTemp.value ?? 0) >= 80  ? theme.palette.warning.main :
                theme.palette.success.main
              }
            />
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
