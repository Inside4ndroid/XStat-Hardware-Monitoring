import React, { useRef } from 'react'
import {
  Box, Typography, Divider, Switch, FormControlLabel,
  Tooltip, alpha, useTheme, ToggleButtonGroup, ToggleButton,
  TextField, Button,
} from '@mui/material'
import ImageIcon        from '@mui/icons-material/Image'
import ColorLensIcon    from '@mui/icons-material/ColorLens'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { PanelLayout } from '@/types/panel'

const PRESET_COLORS = [
  '#0d0d10', '#000000', '#1a1a2e', '#0f2027',
  '#1b1b2f', '#212121', '#ffffff', '#1e1e1e',
]

const GRID_DOT_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#888888', label: 'Gray' },
  { value: '#444444', label: 'Dark gray' },
  { value: '#0084ff', label: 'Blue' },
  { value: '#00e676', label: 'Green' },
  { value: '#ff5252', label: 'Red' },
]

interface Props {
  panel: PanelLayout
  onUpdate: (updates: { canvasBackground?: string; canvasBackgroundImage?: string | null; canvasShowGrid?: boolean; canvasGridColor?: string }) => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        color: 'text.disabled', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        display: 'block', mb: 1,
      }}
    >
      {children}
    </Typography>
  )
}

export const CanvasProperties: React.FC<Props> = ({ panel, onUpdate }) => {
  const theme = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // RAF throttle for native color pickers
  const bgRafRef   = useRef<number | null>(null)
  const bgPending  = useRef<string>('')
  const dotRafRef  = useRef<number | null>(null)
  const dotPending = useRef<string>('')

  function handleBgColorChange(value: string) {
    bgPending.current = value
    if (bgRafRef.current !== null) return
    bgRafRef.current = requestAnimationFrame(() => {
      bgRafRef.current = null
      onUpdate({ canvasBackground: bgPending.current })
    })
  }

  function handleDotColorChange(value: string) {
    dotPending.current = value
    if (dotRafRef.current !== null) return
    dotRafRef.current = requestAnimationFrame(() => {
      dotRafRef.current = null
      onUpdate({ canvasGridColor: dotPending.current })
    })
  }

  const hasImage = Boolean(panel.canvasBackgroundImage)
  const [bgMode, setBgMode] = React.useState<'color' | 'image'>(hasImage ? 'image' : 'color')

  // Sync bgMode if panel changes (e.g. panel switch)
  React.useEffect(() => {
    setBgMode(panel.canvasBackgroundImage ? 'image' : 'color')
  }, [panel.id, panel.canvasBackgroundImage])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string')
        onUpdate({ canvasBackgroundImage: reader.result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleUrlChange(url: string) {
    onUpdate({ canvasBackgroundImage: url || null })
  }

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Canvas
        </Typography>
      </Box>

      <Divider />

      {/* ── Grid dots ──────────────────────────────────────────────── */}
      <Box>
        <SectionLabel>Grid</SectionLabel>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={panel.canvasShowGrid}
              onChange={e => onUpdate({ canvasShowGrid: e.target.checked })}
            />
          }
          label={<Typography variant="body2">Show dot grid</Typography>}
        />

        {panel.canvasShowGrid && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Dot color</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {GRID_DOT_COLORS.map(c => (
                <Tooltip key={c.value} title={c.label} arrow>
                  <Box
                    onClick={() => onUpdate({ canvasGridColor: c.value })}
                    sx={{
                      width: 22, height: 22, borderRadius: '4px',
                      background: c.value, cursor: 'pointer', flexShrink: 0,
                      border: (panel.canvasGridColor ?? '#ffffff') === c.value
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${alpha('#ffffff', 0.15)}`,
                      boxSizing: 'border-box',
                      '&:hover': { opacity: 0.8 },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="color"
                value={panel.canvasGridColor ?? '#ffffff'}
                onChange={e => handleDotColorChange(e.target.value)}
                style={{
                  width: 32, height: 28, borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${theme.palette.divider}`,
                  padding: 2, background: 'transparent',
                }}
              />
              <TextField
                size="small"
                fullWidth
                label="Hex"
                value={panel.canvasGridColor ?? '#ffffff'}
                onChange={e => onUpdate({ canvasGridColor: e.target.value })}
                inputProps={{ spellCheck: false }}
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
            </Box>
          </Box>
        )}
      </Box>

      <Divider />

      {/* ── Background type ────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionLabel>Background</SectionLabel>

        <ToggleButtonGroup
          size="small"
          exclusive
          fullWidth
          value={bgMode}
          onChange={(_, v) => {
            if (!v) return
            setBgMode(v)
            if (v === 'color') onUpdate({ canvasBackgroundImage: null })
          }}
        >
          <ToggleButton value="color">
            <ColorLensIcon fontSize="small" sx={{ mr: 0.5 }} /> Solid
          </ToggleButton>
          <ToggleButton value="image">
            <ImageIcon fontSize="small" sx={{ mr: 0.5 }} /> Image
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Solid color */}
        {bgMode === 'color' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {PRESET_COLORS.map(c => (
                <Tooltip key={c} title={c} arrow>
                  <Box
                    onClick={() => onUpdate({ canvasBackground: c })}
                    sx={{
                      width: 22, height: 22, borderRadius: '4px',
                      background: c, cursor: 'pointer', flexShrink: 0,
                      border: panel.canvasBackground === c
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${alpha('#ffffff', 0.15)}`,
                      boxSizing: 'border-box',
                      '&:hover': { opacity: 0.8 },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="color"
                value={panel.canvasBackground}
                onChange={e => handleBgColorChange(e.target.value)}
                style={{
                  width: 32, height: 28, borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${theme.palette.divider}`,
                  padding: 2, background: 'transparent',
                }}
              />
              <TextField
                size="small"
                fullWidth
                label="Hex"
                value={panel.canvasBackground}
                onChange={e => onUpdate({ canvasBackground: e.target.value })}
                inputProps={{ spellCheck: false }}
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
            </Box>
          </Box>
        )}

        {/* Image */}
        {bgMode === 'image' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Preview thumbnail */}
            {panel.canvasBackgroundImage && (
              <Box
                sx={{
                  width: '100%', height: 80, borderRadius: 1,
                  backgroundImage: `url("${panel.canvasBackgroundImage}")`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  border: `1px solid ${alpha('#ffffff', 0.1)}`,
                  position: 'relative',
                }}
              >
                <Tooltip title="Remove image" arrow>
                  <Box
                    onClick={() => onUpdate({ canvasBackgroundImage: null })}
                    sx={{
                      position: 'absolute', top: 4, right: 4,
                      background: alpha('#000', 0.6), borderRadius: 1,
                      p: 0.25, cursor: 'pointer', color: 'error.main',
                      display: 'flex', alignItems: 'center',
                      '&:hover': { background: alpha('#000', 0.85) },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Tooltip>
              </Box>
            )}

            <Button
              size="small"
              variant="outlined"
              startIcon={<ImageIcon fontSize="small" />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ fontSize: '0.75rem' }}
            >
              Choose file…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <TextField
              size="small"
              fullWidth
              label="Or paste URL"
              placeholder="https://…"
              value={panel.canvasBackgroundImage?.startsWith('data:') ? '' : (panel.canvasBackgroundImage ?? '')}
              onChange={e => handleUrlChange(e.target.value)}
              inputProps={{ spellCheck: false }}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.78rem' } }}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
