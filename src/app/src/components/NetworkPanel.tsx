import React from 'react'
import {
  Box, Typography, Card, CardContent, Divider, useTheme, Chip
} from '@mui/material'
import RouterIcon    from '@mui/icons-material/Router'
import WifiIcon      from '@mui/icons-material/Wifi'
import BluetoothIcon from '@mui/icons-material/Bluetooth'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward'
import { Sparkline } from '@/components/Primitives'
import type { SensorReading } from '@/types/sensors'
import type { HistoryPoint } from '@/hooks/useSensorHistory'

interface NetworkPanelProps {
  sensors: SensorReading[]
  history: Map<string, HistoryPoint[]>
}

/** Detect NIC type from adapter name for icon + label. */
function nicType(name: string): 'wifi' | 'bluetooth' | 'ethernet' {
  const n = name.toLowerCase()
  if (n.includes('wi-fi') || n.includes('wifi') || n.includes('wireless') || n.includes('wlan'))
    return 'wifi'
  if (n.includes('bluetooth'))
    return 'bluetooth'
  return 'ethernet'
}

function NicIcon({ type, color }: { type: 'wifi' | 'bluetooth' | 'ethernet'; color: string }) {
  const sx = { fontSize: 16, color }
  if (type === 'wifi')      return <WifiIcon sx={sx} />
  if (type === 'bluetooth') return <BluetoothIcon sx={sx} />
  return <RouterIcon sx={sx} />
}

function fmtSpeed(value: number | null | undefined, unit: string): string {
  if (value == null || value === 0) return '0 Mbps'
  if (unit === 'Mbps') {
    if (value >= 1)        return `${value.toFixed(1)} Mbps`
    if (value >= 0.001)   return `${(value * 1000).toFixed(1)} Kbps`
    return `${(value * 1_000_000).toFixed(0)} bps`
  }
  return `${value.toFixed(1)} ${unit}`
}

export const NetworkPanel: React.FC<NetworkPanelProps> = ({ sensors, history }) => {
  const theme = useTheme()
  const netSensors = sensors.filter(s => s.category === 'Network')
  if (netSensors.length === 0) return null

  // Group by hardware name (real NICs only — filtering done in service)
  const interfaceMap = new Map<string, SensorReading[]>()
  for (const s of netSensors) {
    if (!interfaceMap.has(s.hardwareName)) interfaceMap.set(s.hardwareName, [])
    interfaceMap.get(s.hardwareName)!.push(s)
  }

  // Sort: active first (any throughput > 0), then alphabetical
  const sorted = [...interfaceMap.entries()].sort(([, a], [, b]) => {
    const aActive = a.some(s => s.type === 'Throughput' && (s.value ?? 0) > 0)
    const bActive = b.some(s => s.type === 'Throughput' && (s.value ?? 0) > 0)
    if (aActive !== bActive) return aActive ? -1 : 1
    return 0
  })

  const dlColor = theme.palette.success.main
  const ulColor = theme.palette.info.main

  return (
    <Card>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color: ulColor, display: 'flex' }}><RouterIcon /></Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Network</Typography>
        </Box>

        {sorted.map(([ifName, ifSensors], idx) => {
          const dl = ifSensors.find(s => s.type === 'Throughput' && s.name.toLowerCase().includes('download'))
          const ul = ifSensors.find(s => s.type === 'Throughput' && s.name.toLowerCase().includes('upload'))
          const type = nicType(ifName)
          const isActive = (dl?.value ?? 0) > 0 || (ul?.value ?? 0) > 0

          const dlHistory = dl ? (history.get(dl.id) ?? []) : []
          const ulHistory = ul ? (history.get(ul.id) ?? []) : []
          const showSparklines = dlHistory.length > 1 || ulHistory.length > 1

          return (
            <Box key={ifName}>
              {idx > 0 && <Divider sx={{ my: 1.5, opacity: 0.4 }} />}

              {/* Adapter name row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <NicIcon type={type} color={isActive ? ulColor : theme.palette.text.disabled} />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ flex: 1, fontSize: '0.72rem', fontWeight: 600,
                        color: isActive ? 'text.primary' : 'text.disabled' }}
                >
                  {ifName}
                </Typography>
                <Chip
                  label={type.toUpperCase()}
                  size="small"
                  sx={{
                    height: 16, fontSize: '0.6rem', fontWeight: 700,
                    bgcolor: isActive
                      ? (type === 'wifi' ? 'primary.main' : type === 'bluetooth' ? 'secondary.main' : ulColor)
                      : 'action.disabledBackground',
                    color: isActive ? '#fff' : 'text.disabled',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Box>

              {/* Speed row */}
              <Box sx={{ display: 'flex', gap: 2, mb: showSparklines ? 1 : 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ArrowDownwardIcon sx={{ fontSize: 14, color: dlColor }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: dlColor, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtSpeed(dl?.value, dl?.unit ?? 'Mbps')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ArrowUpwardIcon sx={{ fontSize: 14, color: ulColor }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: ulColor, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtSpeed(ul?.value, ul?.unit ?? 'Mbps')}
                  </Typography>
                </Box>
              </Box>

              {/* Combined sparkline (only when active) */}
              {showSparklines && isActive && (
                <Box sx={{ mt: 0.5 }}>
                  <Sparkline data={dlHistory} color={dlColor} height={32} unit={dl?.unit ?? 'MB/s'} />
                </Box>
              )}
            </Box>
          )
        })}
      </CardContent>
    </Card>
  )
}
