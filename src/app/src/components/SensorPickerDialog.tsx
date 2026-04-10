import React, { useState, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, InputAdornment,
  alpha, useTheme, Divider,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { SensorReading } from '@/types/sensors'

interface Props {
  open: boolean
  sensors: SensorReading[]
  selectedId?: string
  onSelect: (sensor: SensorReading | null) => void
  onClose: () => void
}

const CATEGORY_ORDER = ['CPU', 'GPU', 'RAM', 'Storage', 'Network', 'Motherboard', 'Battery', 'PSU', 'EC', 'Other']

export const SensorPickerDialog: React.FC<Props> = ({ open, sensors, selectedId, onSelect, onClose }) => {
  const theme = useTheme()
  const [search, setSearch] = useState('')

  // Reset search when dialog opens
  React.useEffect(() => { if (open) setSearch('') }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return sensors
    return sensors.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.hardwareName.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q)
    )
  }, [sensors, search])

  // Group: category → hardwareName → sensors[]
  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category)
      const bi = CATEGORY_ORDER.indexOf(b.category)
      const ci = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      if (ci !== 0) return ci
      return (
        a.hardwareName.localeCompare(b.hardwareName) ||
        a.type.localeCompare(b.type) ||
        a.name.localeCompare(b.name)
      )
    })
    const map = new Map<string, Map<string, SensorReading[]>>()
    for (const s of sorted) {
      if (!map.has(s.category)) map.set(s.category, new Map())
      const hw = map.get(s.category)!
      if (!hw.has(s.hardwareName)) hw.set(s.hardwareName, [])
      hw.get(s.hardwareName)!.push(s)
    }
    return map
  }, [filtered])

  function handleSelect(s: SensorReading) {
    onSelect(s)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { height: '78vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ pb: 1, fontSize: '1rem', fontWeight: 700 }}>
        Bind Sensor
        {sensors.length > 0 && (
          <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.disabled' }}>
            {sensors.length} available
          </Typography>
        )}
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1.5 }}>
        <TextField
          autoFocus
          size="small"
          fullWidth
          placeholder="Search by name, type, hardware…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0, overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              {sensors.length === 0 ? 'Service not connected' : 'No matching sensors'}
            </Typography>
          </Box>
        ) : (
          Array.from(grouped.entries()).map(([category, hwMap]) => (
            <Box key={category}>
              {/* Category header */}
              <Box sx={{
                px: 2, py: 0.75,
                backgroundColor: theme.palette.background.paper,
                backgroundImage: `linear-gradient(${alpha(theme.palette.primary.main, 0.18)}, ${alpha(theme.palette.primary.main, 0.18)})`,
                position: 'sticky', top: 0, zIndex: 2,
              }}>
                <Typography variant="caption" sx={{
                  fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'primary.main',
                }}>
                  {category}
                </Typography>
              </Box>

              {Array.from(hwMap.entries()).map(([hw, hwSensors]) => (
                <Box key={hw}>
                  {/* Hardware sub-header */}
                  <Box sx={{ px: 2.5, py: 0.4, background: alpha('#ffffff', 0.02) }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                      {hw}
                    </Typography>
                  </Box>

                  {hwSensors.map(s => {
                    const isSelected = s.id === selectedId
                    return (
                      <Box
                        key={s.id}
                        onClick={() => handleSelect(s)}
                        sx={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 2.5, py: 0.6, cursor: 'pointer',
                          background: isSelected
                            ? alpha(theme.palette.primary.main, 0.15)
                            : 'transparent',
                          '&:hover': {
                            background: isSelected
                              ? alpha(theme.palette.primary.main, 0.22)
                              : alpha('#ffffff', 0.05),
                          },
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'primary.light' : 'text.primary',
                            fontSize: '0.8rem', lineHeight: 1.3,
                          }}>
                            {s.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                            {s.type}
                          </Typography>
                        </Box>
                        {s.value != null && (
                          <Typography variant="body2" sx={{
                            fontFamily: 'monospace', fontSize: '0.78rem',
                            color: isSelected ? 'primary.light' : 'text.secondary',
                            ml: 2, flexShrink: 0,
                          }}>
                            {s.value.toFixed(1)} {s.unit}
                          </Typography>
                        )}
                      </Box>
                    )
                  })}
                  <Divider sx={{ opacity: 0.3 }} />
                </Box>
              ))}
            </Box>
          ))
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button
          size="small"
          color="error"
          variant="text"
          onClick={() => { onSelect(null); onClose() }}
        >
          Clear binding
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}
