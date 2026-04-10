import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Slider,
  TextField,
  Button,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser'
import { QRCodeSVG } from 'qrcode.react'
import { useAppSettings } from '@/hooks/useAppSettings'

const POLL_MARKS = [
  { value: 250,  label: '250ms' },
  { value: 500,  label: '500ms' },
  { value: 1000, label: '1s'    },
  { value: 2000, label: '2s'    },
  { value: 5000, label: '5s'    },
]

export const Settings: React.FC = () => {
  const theme = useTheme()
  const [panelUrl, setPanelUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { settings, setPollIntervalMs } = useAppSettings()
  const [portInput, setPortInput] = useState<string>('9421')
  const [portSaving, setPortSaving] = useState(false)
  const [portSaved, setPortSaved] = useState(false)
  const [startMinimized, setStartMinimized] = useState(false)
  const [startWithWindows, setStartWithWindows] = useState(false)

  useEffect(() => {
    window.xstat?.service?.getPanelUrl?.().then(setPanelUrl)
    window.xstat?.service?.getPort?.().then(p => setPortInput(String(p)))
    window.xstat?.settings?.getStartMinimized?.().then(setStartMinimized)
    window.xstat?.settings?.getStartWithWindows?.().then(setStartWithWindows)
  }, [])

  const applyPort = async () => {
    const n = parseInt(portInput, 10)
    if (isNaN(n) || n < 1024 || n > 65535) return
    setPortSaving(true)
    try {
      const newPort = await window.xstat.service.setPort(n)
      setPortInput(String(newPort))
      setPortSaved(true)
      setTimeout(() => setPortSaved(false), 3000)
      window.xstat?.service?.getPanelUrl?.().then(setPanelUrl)
    } finally {
      setPortSaving(false)
    }
  }

  const copyUrl = () => {
    if (!panelUrl) return
    navigator.clipboard.writeText(panelUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>

      <Typography variant="overline" color="text.secondary">Service</Typography>
      <List disablePadding sx={{ mb: 2 }}>
        <ListItem>
          <ListItemText
            primary="Service port"
            secondary="Range 1024–65535 — service will restart on apply"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              value={portInput}
              onChange={e => { setPortSaved(false); setPortInput(e.target.value) }}
              onKeyDown={e => { if (e.key === 'Enter') applyPort() }}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', style: { width: 70, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={applyPort}
              disabled={portSaving}
              sx={{ minWidth: 70, borderRadius: 1.5, fontSize: '0.72rem' }}
            >
              {portSaving ? <CircularProgress size={14} /> : portSaved ? 'Restarted' : 'Apply'}
            </Button>
          </Box>
        </ListItem>
        <Divider />
        <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
          <ListItemText
            primary="Poll interval"
            secondary="How often sensor data is read from hardware"
            sx={{ mb: 1, width: '100%' }}
          />
          <Box sx={{ width: '100%', px: 1 }}>
            <Slider
              value={settings.pollIntervalMs}
              onChange={(_, v) => setPollIntervalMs(v as number)}
              min={250}
              max={5000}
              step={null}
              marks={POLL_MARKS}
              valueLabelDisplay="auto"
              valueLabelFormat={v => v >= 1000 ? `${v / 1000}s` : `${v}ms`}
              size="small"
              sx={{ color: 'primary.main' }}
            />
          </Box>
        </ListItem>
      </List>

      {/* ── LAN Web Panel ───────────────────────────────────────────── */}
      <Typography variant="overline" color="text.secondary">LAN Web Panel</Typography>
      <Box
        sx={{
          mt: 1,
          mb: 3,
          p: 2,
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
          background: alpha(theme.palette.primary.main, 0.05),
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Open this URL on any phone, tablet, or PC on your network to view live sensor data.
        </Typography>

        {panelUrl ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* URL row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  background: alpha(theme.palette.background.paper, 0.6),
                  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: 'primary.main',
                  userSelect: 'text',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                {panelUrl}
              </Box>
              <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
                <IconButton size="small" onClick={copyUrl}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open in browser">
                <IconButton
                  size="small"
                  onClick={() => { if (panelUrl) window.open(panelUrl, '_blank') }}
                >
                  <OpenInBrowserIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* QR code */}
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: '#ffffff',
                  display: 'inline-flex',
                }}
              >
                <QRCodeSVG
                  value={panelUrl}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#0f0f11"
                  level="M"
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            Loading LAN address…
          </Typography>
        )}
      </Box>

      <Typography variant="overline" color="text.secondary">Display</Typography>
      <List disablePadding>
        <ListItem>
          <FormControlLabel
            control={
              <Switch
                checked={startMinimized}
                onChange={e => {
                  setStartMinimized(e.target.checked)
                  window.xstat?.settings?.setStartMinimized?.(e.target.checked)
                }}
                color="primary"
              />
            }
            label="Start minimised to tray"
          />
        </ListItem>
        <Divider />
        <ListItem>
          <FormControlLabel
            control={
              <Switch
                checked={startWithWindows}
                onChange={e => {
                  setStartWithWindows(e.target.checked)
                  window.xstat?.settings?.setStartWithWindows?.(e.target.checked)
                }}
                color="primary"
              />
            }
            label="Start with Windows"
          />
        </ListItem>
      </List>

      <Box sx={{ mt: 4 }}>
        <Typography variant="caption" color="text.disabled">
          XStat v0.1.0 — open-source hardware monitoring
        </Typography>
      </Box>
    </Box>
  )
}

