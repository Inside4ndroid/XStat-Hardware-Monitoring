import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Box, Typography, Divider, Tooltip, IconButton, TextField,
  Menu, MenuItem, alpha, useTheme, Chip, Button, Select, FormControl, InputLabel,
} from '@mui/material'
import EditIcon            from '@mui/icons-material/Edit'
import VisibilityIcon      from '@mui/icons-material/Visibility'
import AddIcon             from '@mui/icons-material/Add'
import FileDownloadIcon    from '@mui/icons-material/FileDownload'
import FileUploadIcon      from '@mui/icons-material/FileUpload'
import ExpandMoreIcon      from '@mui/icons-material/ExpandMore'
import DeleteOutlineIcon   from '@mui/icons-material/DeleteOutline'
import ZoomInIcon          from '@mui/icons-material/ZoomIn'
import GridOnIcon           from '@mui/icons-material/GridOn'

import { usePanelLayout }    from '@/hooks/usePanelLayout'
import { useSensorHistory }  from '@/hooks/useSensorHistory'
import { WidgetPalette }     from '@/components/WidgetPalette'
import { WidgetProperties }  from '@/components/WidgetProperties'
import { CanvasProperties }  from '@/components/CanvasProperties'
import { PanelCanvas }       from '@/components/PanelCanvas'
import type { HardwareSnapshot } from '@/types/sensors'
import type { WidgetType } from '@/types/panel'

interface PanelEditorProps {
  snapshot: HardwareSnapshot | null
  connected: boolean
  error: string | null
}

export const PanelEditor: React.FC<PanelEditorProps> = ({ snapshot, connected, error: _error }) => {
  const theme = useTheme()
  const {
    panels, activePanel,
    updateLayout, addWidget, updateWidget, removeWidget,
    updateWidgetGeometry, updateCanvasSize,
    createPanel, deletePanel, renamePanel, setActivePanel,
    updateCanvasBackground, updateCanvasSettings, exportPanel, importPanel,
  } = usePanelLayout()
  const history = useSensorHistory(snapshot)

  const [isEditMode,       setIsEditMode]       = useState(true)
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [canvasSelected,   setCanvasSelected]   = useState(false)
  const [renamingPanel,    setRenamingPanel]     = useState(false)
  const [renameValue,      setRenameValue]       = useState('')
  const [panelMenuAnchor,  setPanelMenuAnchor]   = useState<HTMLElement | null>(null)
  const [snapToGrid,       setSnapToGrid]        = useState(false)
  const [zoom,             setZoom]              = useState(1)
  const [panX,             setPanX]              = useState(0)
  const [panY,             setPanY]              = useState(0)
  const importInputRef    = useRef<HTMLInputElement>(null)
  const canvasWrapperRef  = useRef<HTMLDivElement>(null)
  const zoomRef           = useRef(zoom)
  const panRef            = useRef<{ active: boolean; mx0: number; my0: number; px0: number; py0: number }>(
    { active: false, mx0: 0, my0: 0, px0: 0, py0: 0 }
  )

  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // Single source of truth: sync state → inline style
  useEffect(() => {
    if (canvasWrapperRef.current)
      canvasWrapperRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
  }, [zoom, panX, panY])

  // Global pan mouse handlers — zero React renders during drag
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!panRef.current.active) return
      const nx = panRef.current.px0 + (e.clientX - panRef.current.mx0)
      const ny = panRef.current.py0 + (e.clientY - panRef.current.my0)
      if (canvasWrapperRef.current)
        canvasWrapperRef.current.style.transform = `translate(${nx}px, ${ny}px) scale(${zoomRef.current})`
    }
    function onMouseUp(e: MouseEvent) {
      if (!panRef.current.active) return
      panRef.current.active = false
      document.body.style.cursor = ''
      setPanX(panRef.current.px0 + (e.clientX - panRef.current.mx0))
      setPanY(panRef.current.py0 + (e.clientY - panRef.current.my0))
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup',   onMouseUp)
    }
  }, [])

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    panRef.current = { active: true, mx0: e.clientX, my0: e.clientY, px0: panX, py0: panY }
    document.body.style.cursor = 'grabbing'
  }, [panX, panY])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    //e.preventDefault()
    setZoom(z => {
      const next = z - e.deltaY * 0.001
      return Math.round(Math.min(4, Math.max(0.1, next)) * 100) / 100
    })
  }, [])

  const selectedWidget = activePanel.widgets.find(w => w.id === selectedWidgetId) ?? null

  // ── Handlers ────────────────────────────────────────────────────────────
  function handleAddWidget(type: WidgetType) {
    const id = addWidget(type)
    setSelectedWidgetId(id)
  }

  function handleRemove(id: string) {
    removeWidget(id)
    setSelectedWidgetId(null)
  }

  function handleCanvasSelect() {
    setSelectedWidgetId(null)
    setCanvasSelected(true)
  }

  function handleExport() {
    const json = exportPanel()
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${activePanel.name.replace(/\s+/g, '_')}.xstatpanel`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') importPanel(reader.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function startRename() {
    setRenameValue(activePanel.name)
    setRenamingPanel(true)
    setPanelMenuAnchor(null)
  }

  function commitRename() {
    if (renameValue.trim()) renamePanel(renameValue.trim())
    setRenamingPanel(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: alpha(theme.palette.background.paper, 0.6),
        }}
      >
        {/* Edit / Preview toggle */}
        <Tooltip title={isEditMode ? 'Switch to preview' : 'Switch to edit'} arrow>
          <IconButton
            size="small"
            onClick={() => { setIsEditMode(m => !m); setSelectedWidgetId(null) }}
            sx={{
              borderRadius: 1.5,
              color: isEditMode ? 'primary.main' : 'text.secondary',
              background: isEditMode ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
            }}
          >
            {isEditMode ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
          {isEditMode ? 'EDIT' : 'PREVIEW'}
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Panel name / switcher */}
        {renamingPanel ? (
          <TextField
            size="small"
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingPanel(false) }}
            sx={{ width: 160, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.85rem' } }}
          />
        ) : (
          <Box
            onClick={e => setPanelMenuAnchor(e.currentTarget as HTMLElement)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.5, borderRadius: 1.5, cursor: 'pointer',
              '&:hover': { background: alpha('#fff', 0.05) },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {activePanel.name}
            </Typography>
            <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Box>
        )}

        {/* Panel menu */}
        <Menu
          anchorEl={panelMenuAnchor}
          open={Boolean(panelMenuAnchor)}
          onClose={() => setPanelMenuAnchor(null)}
          slotProps={{ paper: { sx: { minWidth: 180 } } }}
        >
          {panels.map(p => (
            <MenuItem
              key={p.id}
              selected={p.id === activePanel.id}
              onClick={() => { setActivePanel(p.id); setPanelMenuAnchor(null); setSelectedWidgetId(null) }}
              sx={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 0.5 }}
            >
              <span>{p.name}</span>
              <Tooltip title="Delete panel" arrow>
                <Box
                  component="span"
                  onClick={e => {
                    e.stopPropagation()
                    deletePanel(p.id)
                    if (p.id === activePanel.id) setPanelMenuAnchor(null)
                  }}
                  sx={{
                    ml: 1.5, p: 0.25, borderRadius: 1, color: 'error.main',
                    display: 'flex', alignItems: 'center',
                    opacity: 0.5,
                    '&:hover': { opacity: 1, background: alpha(theme.palette.error.main, 0.12) },
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                </Box>
              </Tooltip>
            </MenuItem>
          ))}
          <Divider />
          <MenuItem
            onClick={() => { createPanel('New Panel'); setPanelMenuAnchor(null) }}
            sx={{ fontSize: '0.85rem', color: 'primary.main' }}
          >
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> New Panel
          </MenuItem>
          <MenuItem onClick={startRename} sx={{ fontSize: '0.85rem' }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Rename…
          </MenuItem>
        </Menu>

        {/* Canvas background — moved to canvas properties panel; keep palette icon as hint */}

        {/* Canvas size */}
        {isEditMode && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', mr: 0.25 }}>Canvas</Typography>
              <TextField
                size="small" label="W"
                value={activePanel.canvasWidth}
                onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) updateCanvasSize(v, activePanel.canvasHeight) }}
                sx={{ width: 72, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' }, '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { display: 'none' } }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>×</Typography>
              <TextField
                size="small" label="H"
                value={activePanel.canvasHeight}
                onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) updateCanvasSize(activePanel.canvasWidth, v) }}
                sx={{ width: 72, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.8rem' }, '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { display: 'none' } }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>px</Typography>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
              <Tooltip title={snapToGrid ? 'Snap to grid: on' : 'Snap to grid: off'} arrow>
                <IconButton
                  size="small"
                  onClick={() => setSnapToGrid(v => !v)}
                  sx={{
                    color: snapToGrid ? 'primary.main' : 'text.disabled',
                    background: snapToGrid ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                    borderRadius: 1,
                  }}
                >
                  <GridOnIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Widget selector dropdown */}
        {isEditMode && activePanel.widgets.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }} variant="outlined">
            <InputLabel shrink sx={{ fontSize: '0.75rem' }}>Select widget</InputLabel>
            <Select
              label="Select widget"
              value={selectedWidgetId ?? ''}
              onChange={e => {
                const id = e.target.value as string
                setSelectedWidgetId(id || null)
                setCanvasSelected(false)
              }}
              displayEmpty
              sx={{ fontSize: '0.8rem', '& .MuiSelect-select': { py: 0.6 } }}
              MenuProps={{ slotProps: { paper: { sx: { maxHeight: 320 } } } }}
            >
              <MenuItem value=""><em style={{ opacity: 0.5 }}>None</em></MenuItem>
              {[...activePanel.widgets]
                .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))
                .map(w => (
                  <MenuItem key={w.id} value={w.id} sx={{ fontSize: '0.8rem', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 24, textAlign: 'right' }}>
                      z:{w.zIndex ?? 0}
                    </Typography>
                    <span>{w.widgetName ?? w.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {w.label || w.text ? (
                      <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }} noWrap>
                        {w.label ?? w.text}
                      </Typography>
                    ) : null}
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        )}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Chip
          size="small"
          label={connected ? `${snapshot?.sensors.length ?? 0} sensors` : 'Offline'}
          sx={{
            fontSize: '0.68rem', height: 20,
            background: alpha(connected ? theme.palette.success.main : theme.palette.error.main, 0.12),
            color: connected ? 'success.main' : 'error.main',
          }}
        />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Export */}
        <Tooltip title="Export panel (.xstatpanel)" arrow>
          <IconButton size="small" onClick={handleExport}>
            <FileDownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Import */}
        <Tooltip title="Import panel" arrow>
          <IconButton size="small" onClick={() => importInputRef.current?.click()}>
            <FileUploadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <input
          ref={importInputRef}
          type="file"
          accept=".xstatpanel,.json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </Box>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Widget palette (edit mode only) */}
        {isEditMode && (
          <Box
            sx={{
              width: 152, flexShrink: 0,
              borderRight: `1px solid ${theme.palette.divider}`,
              overflowY: 'auto',
              py: 0.5,
            }}
          >
            <WidgetPalette onAdd={handleAddWidget} />
          </Box>
        )}

        {/* Center: Canvas */}
        <Box
          onWheel={handleWheel}
          sx={{
            flex: 1, overflow: 'hidden',
            background: alpha(theme.palette.background.default, 0.6),
            position: 'relative',
            cursor: 'default',
          }}
        >
          {/* Zoom / pan indicator */}
          {(zoom !== 1 || panX !== 0 || panY !== 0) && (
            <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 100, pointerEvents: 'auto' }}>
              <Button
                size="small"
                startIcon={<ZoomInIcon sx={{ fontSize: 14 }} />}
                onClick={() => { setZoom(1); setPanX(0); setPanY(0) }}
                sx={{
                  fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 0,
                  borderRadius: 1.5,
                  background: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  '&:hover': { background: alpha(theme.palette.primary.main, 0.25) },
                }}
              >
                {Math.round(zoom * 100)}% — reset
              </Button>
            </Box>
          )}

          {/* Canvas wrapper — transform driven entirely by useEffect above */}
          <Box
            ref={canvasWrapperRef}
            sx={{
              transformOrigin: '0 0',
              position: 'absolute',
              top: 16, left: 16,
            }}
          >
            <PanelCanvas
              panel={activePanel}
              snapshot={snapshot}
              history={history}
              isEditMode={isEditMode}
              snapToGrid={snapToGrid}
              selectedWidgetId={selectedWidgetId}
              onSelect={id => { setSelectedWidgetId(id); setCanvasSelected(false) }}
              onWidgetGeometry={updateWidgetGeometry}
              onPanStart={handlePanStart}
              onCanvasSelect={handleCanvasSelect}
            />
          </Box>
        </Box>

        {/* Right: Properties panel */}
        {isEditMode && (selectedWidget || canvasSelected) && (
          <Box
            sx={{
              width: 248, flexShrink: 0,
              borderLeft: `1px solid ${theme.palette.divider}`,
              overflowY: 'auto',
            }}
          >
            {selectedWidget ? (
              <WidgetProperties
                widget={selectedWidget}
                layout={activePanel.layout.find(l => l.i === selectedWidget.id)}
                snapshot={snapshot}
                allWidgets={activePanel.widgets}
                onUpdate={updates => updateWidget(selectedWidget.id, updates)}
                onGeometry={geom => updateWidgetGeometry(selectedWidget.id, geom)}
                onRemove={() => handleRemove(selectedWidget.id)}
              />
            ) : (
              <CanvasProperties
                panel={activePanel}
                onUpdate={updateCanvasSettings}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
