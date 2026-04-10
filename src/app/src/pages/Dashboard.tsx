import React from 'react'
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { CPUPanel }         from '@/components/CPUPanel'
import { GPUPanel }         from '@/components/GPUPanel'
import { RAMPanel }         from '@/components/RAMPanel'
import { NetworkPanel }     from '@/components/NetworkPanel'
import { StoragePanel }     from '@/components/StoragePanel'
import { MotherboardPanel } from '@/components/MotherboardPanel'
import { useSensorHistory } from '@/hooks/useSensorHistory'
import type { HardwareSnapshot } from '@/types/sensors'

interface DashboardProps {
  snapshot: HardwareSnapshot | null
  connected: boolean
  error: string | null
}

export const Dashboard: React.FC<DashboardProps> = ({ snapshot, connected, error }) => {
  const theme = useTheme()
  const history = useSensorHistory(snapshot)
  const sensors = snapshot?.sensors ?? []

  return (
    <Box sx={{ p: 2.5, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
          Dashboard
        </Typography>
        <Chip
          size="small"
          icon={
            <FiberManualRecordIcon
              sx={{
                fontSize: '10px !important',
                color: `${connected ? theme.palette.success.main : theme.palette.error.main} !important`,
              }}
            />
          }
          label={connected ? `Live · ${sensors.length} sensors` : 'Disconnected'}
          sx={{
            background: alpha(connected ? theme.palette.success.main : theme.palette.error.main, 0.12),
            color: connected ? 'success.main' : 'error.main',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      {error && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: alpha(theme.palette.error.main, 0.1), border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` }}>
          <Typography variant="body2" color="error">{error}</Typography>
        </Box>
      )}

      {/* Two-column responsive grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2,
        }}
      >
        <CPUPanel         sensors={sensors} history={history} />
        <GPUPanel         sensors={sensors} history={history} />
        <RAMPanel         sensors={sensors} history={history} />
        <NetworkPanel     sensors={sensors} history={history} />
        <StoragePanel     sensors={sensors} />
        <MotherboardPanel sensors={sensors} />
      </Box>
    </Box>
  )
}
