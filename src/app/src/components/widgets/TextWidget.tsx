import React from 'react'
import { Box, Typography } from '@mui/material'
import type { PanelWidget } from '@/types/panel'

interface Props {
  widget: PanelWidget
}

export const TextWidget: React.FC<Props> = ({ widget }) => {
  const color      = widget.color ?? '#ffffff'
  const text       = widget.text ?? 'Label'
  const align      = widget.textAlign ?? 'left'
  const fontWeight = widget.fontWeight ?? 'normal'
  const fontSize   = widget.fontSize ?? 14
  const fontFamily = widget.fontFamily ?? undefined
  const italic     = widget.italic ?? false

  return (
    <Box
      sx={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center',
        px: 1.5, py: 0.75,
      }}
    >
      <Typography
        sx={{
          fontSize, color, fontWeight,
          fontStyle: italic ? 'italic' : 'normal',
          fontFamily,
          textAlign: align,
          width: '100%',
          wordBreak: 'break-word',
          userSelect: 'none',
          lineHeight: 1.3,
        }}
      >
        {text}
      </Typography>
    </Box>
  )
}
