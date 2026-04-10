import React from 'react'
import { Box, IconButton, Typography, alpha, useTheme } from '@mui/material'
import RemoveIcon from '@mui/icons-material/Remove'
import CropSquareIcon from '@mui/icons-material/CropSquare'
import CloseIcon from '@mui/icons-material/Close'

export const TitleBar: React.FC = () => {
  const theme = useTheme()

  const minimize = () => window.xstat?.window.minimize()
  const maximize = () => window.xstat?.window.maximize()
  const close    = () => window.xstat?.window.close()

  return (
    <Box
      sx={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        background: alpha(theme.palette.background.default, 0.95),
        borderBottom: `1px solid ${theme.palette.divider}`,
        // Make the entire bar draggable for the Electron frameless window
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* App name left side */}
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: '0.8rem',
          letterSpacing: '0.08em',
          color: 'primary.main',
          textTransform: 'uppercase',
        }}
      >
        XStat
      </Typography>

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Window controls — not draggable */}
      <Box sx={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
        <IconButton size="small" onClick={minimize} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={maximize} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <CropSquareIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={close}
          sx={{ color: 'text.secondary', '&:hover': { color: theme.palette.error.main } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}
