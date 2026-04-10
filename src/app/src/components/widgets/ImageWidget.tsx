import React from 'react'
import { Box, Typography } from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import type { PanelWidget } from '@/types/panel'

interface Props {
  widget: PanelWidget
}

export const ImageWidget: React.FC<Props> = ({ widget }) => {
  const { imageDataUrl, imageObjectFit = 'contain', imageOpacity = 1 } = widget

  if (!imageDataUrl) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          color: 'rgba(255,255,255,0.2)',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 1,
          boxSizing: 'border-box',
        }}
      >
        <ImageIcon sx={{ fontSize: 32 }} />
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
          No image selected
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      <Box
        component="img"
        src={imageDataUrl}
        alt=""
        sx={{
          width: '100%',
          height: '100%',
          objectFit: imageObjectFit,
          opacity: imageOpacity,
          display: 'block',
        }}
      />
    </Box>
  )
}
