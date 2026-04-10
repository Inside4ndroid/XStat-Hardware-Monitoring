import React, { useState, useRef, useEffect } from 'react'
import {
  Box, Typography, TextField, Switch, FormControlLabel,
  ToggleButton, ToggleButtonGroup, Divider, Button, Autocomplete,
  Tooltip, alpha, useTheme, Select, MenuItem, InputLabel, FormControl, IconButton,
} from '@mui/material'
import SensorsIcon from '@mui/icons-material/Sensors'
import FormatAlignLeftIcon   from '@mui/icons-material/FormatAlignLeft'
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter'
import FormatAlignRightIcon  from '@mui/icons-material/FormatAlignRight'
import DeleteOutlineIcon     from '@mui/icons-material/DeleteOutline'
import CodeIcon              from '@mui/icons-material/Code'
import ImageIcon                    from '@mui/icons-material/Image'
import KeyboardDoubleArrowUpIcon    from '@mui/icons-material/KeyboardDoubleArrowUp'
import KeyboardArrowUpIcon          from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon        from '@mui/icons-material/KeyboardArrowDown'
import KeyboardDoubleArrowDownIcon  from '@mui/icons-material/KeyboardDoubleArrowDown'
import type { PanelWidget, LayoutItem } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'
import { SensorPickerDialog }   from '@/components/SensorPickerDialog'

const PRESET_COLORS = [
  '#03dac6', '#7c6ef5', '#4caf50', '#ff9800',
  '#f44336', '#2196f3', '#e91e63', '#ffffff',
]

function ColorSwatchesPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const theme = useTheme()
  const rafRef = React.useRef<number | null>(null)
  const pendingRef = React.useRef<string>(value)
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pendingRef.current = e.target.value
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      onChange(pendingRef.current)
      rafRef.current = null
    })
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        {PRESET_COLORS.map(c => (
          <Tooltip key={c} title={c} arrow>
            <Box
              onClick={() => onChange(c)}
              sx={{
                width: 17, height: 17, borderRadius: '50%',
                background: c, cursor: 'pointer', flexShrink: 0,
                border: value === c
                  ? `2px solid ${theme.palette.primary.main}`
                  : '2px solid transparent',
                boxSizing: 'border-box',
                '&:hover': { opacity: 0.8 },
              }}
            />
          </Tooltip>
        ))}
      </Box>
      <Box
        component="input"
        type="color"
        value={pickerValue}
        onChange={handlePickerChange}
        sx={{
          display: 'block', width: '100%', height: 28,
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1,
          cursor: 'pointer', padding: '2px 3px',
          background: 'transparent', boxSizing: 'border-box',
        }}
      />
    </>
  )
}

const COMMON_FONTS = [
  'Inter', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS',
  'Georgia', 'Times New Roman', 'Courier New', 'Lucida Console',
  'Impact', 'Comic Sans MS', 'Segoe UI', 'Calibri', 'Consolas',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
]

interface Props {
  widget: PanelWidget
  layout?: LayoutItem
  snapshot: HardwareSnapshot | null
  allWidgets?: PanelWidget[]
  onUpdate: (updates: Partial<PanelWidget>) => void
  onGeometry?: (geom: Partial<Omit<LayoutItem, 'i'>>) => void
  onRemove: () => void
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

function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Box>
      <SectionLabel>Color</SectionLabel>
      <ColorSwatchesPicker value={value} onChange={onChange} />
      <TextField
        size="small"
        fullWidth
        label="Custom hex"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        inputProps={{ spellCheck: false }}
        sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
      />
    </Box>
  )
}

function AccentColorRow({ value, onChange, visible, onVisibleChange }: {
  value: string; onChange: (c: string) => void
  visible?: boolean; onVisibleChange?: (v: boolean) => void
}) {
  const on = visible ?? true
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: on ? 1 : 0.45 }}>
          Accent (bar / line / arc)
        </Typography>
        <Switch size="small" checked={on} onChange={e => onVisibleChange?.(e.target.checked)} sx={{ mr: -0.5 }} />
      </Box>
      {on && (
        <>
          <ColorSwatchesPicker value={value} onChange={onChange} />
          <TextField
            size="small"
            fullWidth
            label="Custom hex"
            value={value}
            onChange={e => onChange(e.target.value)}
            inputProps={{ spellCheck: false }}
            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
        </>
      )}
    </Box>
  )
}

function TextStyleSection({
  title, color, fontSize, bold, fontFamily, italic,
  visible, onVisibleChange,
  onColorChange, onFontSizeChange, onBoldChange, onFontFamilyChange, onItalicChange,
}: {
  title: string
  color: string
  fontSize: number
  bold: boolean
  fontFamily: string
  italic: boolean
  visible?: boolean
  onVisibleChange?: (v: boolean) => void
  onColorChange: (c: string) => void
  onFontSizeChange: (s: number) => void
  onBoldChange: (b: boolean) => void
  onFontFamilyChange: (f: string) => void
  onItalicChange: (i: boolean) => void
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            opacity: onVisibleChange && visible === false ? 0.45 : 1,
          }}
        >
          {title}
        </Typography>
        {onVisibleChange !== undefined && (
          <Switch
            size="small"
            checked={visible ?? true}
            onChange={e => onVisibleChange(e.target.checked)}
            sx={{ mr: -0.5 }}
          />
        )}
      </Box>
      {(visible ?? true) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <ColorSwatchesPicker value={color} onChange={onColorChange} />
        <TextField
          size="small"
          fullWidth
          label="Color (hex)"
          value={color}
          onChange={e => onColorChange(e.target.value)}
          inputProps={{ spellCheck: false }}
          sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
        />
        <TextField
          size="small"
          fullWidth
          label="Font Size (px)"
          type="number"
          value={fontSize}
          onChange={e => onFontSizeChange(Math.max(6, Number(e.target.value)))}
          inputProps={{ min: 6, max: 200, step: 1 }}
        />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            sx={{ mr: 0, ml: 0 }}
            control={
              <Switch size="small" checked={bold} onChange={e => onBoldChange(e.target.checked)} />
            }
            label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Bold</Typography>}
          />
          <FormControlLabel
            sx={{ mr: 0, ml: 0 }}
            control={
              <Switch size="small" checked={italic} onChange={e => onItalicChange(e.target.checked)} />
            }
            label={<Typography variant="body2" sx={{ fontStyle: 'italic' }}>Italic</Typography>}
          />
        </Box>
        <Autocomplete
          size="small"
          freeSolo
          options={COMMON_FONTS}
          value={fontFamily}
          onInputChange={(_, v) => onFontFamilyChange(v)}
          renderInput={params => (
            <TextField {...params} label="Font family" placeholder="default" />
          )}
          renderOption={(props, option) => (
            <li {...props} style={{ fontFamily: option, fontSize: '0.82rem' }}>{option}</li>
          )}
        />
      </Box>
      )}
    </Box>
  )
}

const isSensorWidget = (w: PanelWidget) =>
  ['SensorValue', 'SensorBar', 'SensorSparkline', 'SensorGauge'].includes(w.type)

const hasRange = (w: PanelWidget) =>
  w.type === 'SensorBar' || w.type === 'SensorGauge'

export const WidgetProperties: React.FC<Props> = ({ widget, layout, snapshot, allWidgets, onUpdate, onGeometry, onRemove }) => {
  const theme = useTheme()
  const sensors = snapshot?.sensors ?? []
  const [sensorDialogOpen, setSensorDialogOpen] = useState(false)
  const [renamingWidget, setRenamingWidget] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  function startRename() {
    setRenameValue(widget.widgetName ?? widget.type.replace(/([A-Z])/g, ' $1').trim())
    setRenamingWidget(true)
  }

  function commitRename() {
    const trimmed = renameValue.trim()
    onUpdate({ widgetName: trimmed || undefined })
    setRenamingWidget(false)
  }

  // Listen for save events from the detached editor window
  useEffect(() => {
    window.xstat.widgetEditor.onSaved(({ widgetId, html, files }) => {
      if (widgetId === widget.id) {
        onUpdate({ customHtml: html, customFiles: files })
      }
    })
    return () => { window.xstat.widgetEditor.offSaved() }
  }, [widget.id, onUpdate])

  // Sort: category → hardwareName → sensorType → name
  // Group by hardwareName so duplicate sensor names (e.g. "Upload Speed" across 10 NICs)
  // each appear under their own adapter heading
  const sortedSensors = [...sensors].sort((a, b) =>
    a.category.localeCompare(b.category) ||
    a.hardwareName.localeCompare(b.hardwareName) ||
    a.type.localeCompare(b.type) ||
    a.name.localeCompare(b.name)
  )
  const selectedSensor = sensors.find(s => s.id === widget.sensorId) ?? null

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
        {renamingWidget ? (
          <TextField
            size="small"
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingWidget(false) }}
            sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.4, fontSize: '0.85rem', fontWeight: 700 } }}
          />
        ) : (
          <Tooltip title="Click to rename" arrow placement="bottom-start">
            <Typography
              variant="subtitle2"
              onClick={startRename}
              sx={{
                fontWeight: 700, textTransform: 'capitalize', cursor: 'text', flex: 1,
                px: 0.5, py: 0.25, borderRadius: 1, border: '1px solid transparent',
                '&:hover': { border: `1px solid ${alpha('#ffffff', 0.15)}`, background: alpha('#ffffff', 0.04) },
              }}
            >
              {widget.widgetName ?? widget.type.replace(/([A-Z])/g, ' $1').trim()}
            </Typography>
          </Tooltip>
        )}
        <Tooltip title="Delete widget" arrow>
          <Box
            onClick={onRemove}
            sx={{
              p: 0.5, borderRadius: 1, cursor: 'pointer', color: 'error.main',
              '&:hover': { background: alpha(theme.palette.error.main, 0.1) },
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>

      <Divider />

      {/* ── Position & Size ──────────────────────────────────────── */}
      {layout && onGeometry && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionLabel>Position &amp; Size</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              size="small" label="X" type="number"
              value={layout.x}
              onChange={e => onGeometry({ x: Math.round(Number(e.target.value)) })}
              inputProps={{ step: 1 }}
            />
            <TextField
              size="small" label="Y" type="number"
              value={layout.y}
              onChange={e => onGeometry({ y: Math.round(Number(e.target.value)) })}
              inputProps={{ step: 1 }}
            />
            <TextField
              size="small" label="W" type="number"
              value={layout.w}
              onChange={e => onGeometry({ w: Math.max(1, Math.round(Number(e.target.value))) })}
              inputProps={{ step: 1, min: 1 }}
            />
            <TextField
              size="small" label="H" type="number"
              value={layout.h}
              onChange={e => onGeometry({ h: Math.max(1, Math.round(Number(e.target.value))) })}
              inputProps={{ step: 1, min: 1 }}
            />
          </Box>
        </Box>
      )}

      <Divider />

      {/* ── Layer ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <SectionLabel>Layer</SectionLabel>
        <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
          <Tooltip title="Send to Back" arrow>
            <IconButton size="small" onClick={() => {
              const min = Math.min(...(allWidgets ?? [widget]).map(w => w.zIndex ?? 0))
              onUpdate({ zIndex: min - 1 })
            }}>
              <KeyboardDoubleArrowDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Send Backward" arrow>
            <IconButton size="small" onClick={() => onUpdate({ zIndex: (widget.zIndex ?? 0) - 1 })}>
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bring Forward" arrow>
            <IconButton size="small" onClick={() => onUpdate({ zIndex: (widget.zIndex ?? 0) + 1 })}>
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bring to Front" arrow>
            <IconButton size="small" onClick={() => {
              const max = Math.max(...(allWidgets ?? [widget]).map(w => w.zIndex ?? 0))
              onUpdate({ zIndex: max + 1 })
            }}>
              <KeyboardDoubleArrowUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ ml: 'auto', color: 'text.disabled' }}>
            z: {widget.zIndex ?? 0}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* ── Sensor binding ──────────────────────────────────────── */}
      {isSensorWidget(widget) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionLabel>Sensor</SectionLabel>

          {/* Bind sensor button */}
          <Button
            size="small"
            variant="outlined"
            fullWidth
            startIcon={<SensorsIcon sx={{ fontSize: 16 }} />}
            onClick={() => setSensorDialogOpen(true)}
            sx={{
              justifyContent: 'flex-start', textTransform: 'none',
              fontFamily: 'inherit', fontSize: '0.8rem',
              color: selectedSensor ? 'text.primary' : 'text.disabled',
              borderColor: selectedSensor ? 'divider' : alpha('#ffffff', 0.15),
              overflow: 'hidden',
            }}
          >
            <Box sx={{ overflow: 'hidden', textAlign: 'left' }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontSize: '0.8rem', lineHeight: 1.3, color: selectedSensor ? 'text.primary' : 'text.disabled' }}
              >
                {selectedSensor ? selectedSensor.name : 'Choose sensor…'}
              </Typography>
              {selectedSensor && (
                <Typography variant="caption" noWrap sx={{ fontSize: '0.68rem', color: 'text.disabled', display: 'block' }}>
                  {selectedSensor.hardwareName} · {selectedSensor.type}
                </Typography>
              )}
            </Box>
          </Button>

          <SensorPickerDialog
            open={sensorDialogOpen}
            sensors={sortedSensors}
            selectedId={widget.sensorId}
            onSelect={s => onUpdate({ sensorId: s?.id })}
            onClose={() => setSensorDialogOpen(false)}
          />
          <TextField
            size="small"
            fullWidth
            label="Label override"
            placeholder={selectedSensor?.name ?? 'Sensor name'}
            value={widget.label ?? ''}
            onChange={e => onUpdate({ label: e.target.value || undefined })}
          />
          <TextField
            size="small"
            fullWidth
            label="Unit override"
            placeholder={selectedSensor?.unit ?? 'e.g. °C'}
            value={widget.unit ?? ''}
            onChange={e => onUpdate({ unit: e.target.value || undefined })}
          />
        </Box>
      )}

      {/* ── Range (Bar + Gauge) ──────────────────────────────────── */}
      {hasRange(widget) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionLabel>Range</SectionLabel>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              label="Min"
              type="number"
              value={widget.min ?? 0}
              onChange={e => onUpdate({ min: Number(e.target.value) })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Max"
              type="number"
              value={widget.max ?? 100}
              onChange={e => onUpdate({ max: Number(e.target.value) })}
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>
      )}

      {/* ── Clock settings ───────────────────────────────────────── */}
      {widget.type === 'Clock' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionLabel>Clock</SectionLabel>

          {/* Time section */}
          <FormControlLabel
            control={
              <Switch size="small"
                checked={widget.showTime ?? true}
                onChange={e => onUpdate({ showTime: e.target.checked })}
              />
            }
            label={<Typography variant="body2">Show time</Typography>}
          />
          {(widget.showTime ?? true) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 1, borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
              <ToggleButtonGroup size="small" exclusive fullWidth
                value={widget.clockFormat ?? '24h'}
                onChange={(_, v) => v && onUpdate({ clockFormat: v })}
              >
                <ToggleButton value="24h">24h</ToggleButton>
                <ToggleButton value="12h">12h</ToggleButton>
              </ToggleButtonGroup>
              <FormControlLabel
                control={
                  <Switch size="small"
                    checked={widget.showSeconds ?? true}
                    onChange={e => onUpdate({ showSeconds: e.target.checked })}
                  />
                }
                label={<Typography variant="body2">Show seconds</Typography>}
              />
              {(widget.clockFormat ?? '24h') === '12h' && (
                <FormControlLabel
                  control={
                    <Switch size="small"
                      checked={widget.showAmPm ?? true}
                      onChange={e => onUpdate({ showAmPm: e.target.checked })}
                    />
                  }
                  label={<Typography variant="body2">Show AM/PM</Typography>}
                />
              )}
              <TextStyleSection
                title="Time style"
                color={widget.color ?? '#ffffff'}
                fontSize={widget.fontSize ?? 28}
                bold={widget.timeBold ?? true}
                fontFamily={widget.fontFamily ?? ''}
                italic={widget.italic ?? false}
                onColorChange={c => onUpdate({ color: c })}
                onFontSizeChange={s => onUpdate({ fontSize: s })}
                onBoldChange={b => onUpdate({ timeBold: b })}
                onFontFamilyChange={f => onUpdate({ fontFamily: f || undefined })}
                onItalicChange={i => onUpdate({ italic: i })}
              />
            </Box>
          )}

          <Divider />

          {/* Date section */}
          <FormControlLabel
            control={
              <Switch size="small"
                checked={widget.showDate ?? false}
                onChange={e => onUpdate({ showDate: e.target.checked })}
              />
            }
            label={<Typography variant="body2">Show date</Typography>}
          />
          {(widget.showDate ?? false) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 1, borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Date format</InputLabel>
                <Select
                  label="Date format"
                  value={widget.dateFormat ?? 'long'}
                  onChange={e => onUpdate({ dateFormat: e.target.value as any })}
                >
                  <MenuItem value="numeric">04/08/2026</MenuItem>
                  <MenuItem value="short">Apr 8, 2026</MenuItem>
                  <MenuItem value="long">Wed, Apr 8, 2026</MenuItem>
                  <MenuItem value="full">Wednesday, April 8, 2026</MenuItem>
                  <MenuItem value="day">Wednesday</MenuItem>
                </Select>
              </FormControl>
              <TextStyleSection
                title="Date style"
                color={widget.dateColor ?? 'rgba(255,255,255,0.45)'}
                fontSize={widget.dateFontSize ?? 11}
                bold={widget.dateBold ?? false}
                fontFamily={widget.dateFontFamily ?? ''}
                italic={widget.dateItalic ?? false}
                onColorChange={c => onUpdate({ dateColor: c })}
                onFontSizeChange={s => onUpdate({ dateFontSize: s })}
                onBoldChange={b => onUpdate({ dateBold: b })}
                onFontFamilyChange={f => onUpdate({ dateFontFamily: f || undefined })}
                onItalicChange={i => onUpdate({ dateItalic: i })}
              />
            </Box>
          )}
        </Box>
      )}

      {/* ── Text settings ────────────────────────────────────────── */}
      {widget.type === 'Text' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionLabel>Text</SectionLabel>
          <TextField
            size="small"
            fullWidth
            label="Content"
            multiline
            minRows={2}
            value={widget.text ?? ''}
            onChange={e => onUpdate({ text: e.target.value })}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              Align
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={widget.textAlign ?? 'left'}
              onChange={(_, v) => v && onUpdate({ textAlign: v })}
            >
              <ToggleButton value="left"><FormatAlignLeftIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="center"><FormatAlignCenterIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="right"><FormatAlignRightIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={widget.fontWeight === 'bold'}
                onChange={e => onUpdate({ fontWeight: e.target.checked ? 'bold' : 'normal' })}
              />
            }
            label={<Typography variant="body2">Bold</Typography>}
          />
        </Box>
      )}

      {/* ── Font size (Text only) ─────────────────────── */}
      {widget.type === 'Text' && (
        <Box>
          <SectionLabel>Font</SectionLabel>
          <TextField
            size="small"
            fullWidth
            label="Size (px)"
            type="number"
            value={widget.fontSize ?? 14}
            inputProps={{ min: 8, max: 120, step: 2 }}
            onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
            <FormControlLabel
              sx={{ mr: 0, ml: 0 }}
              control={
                <Switch
                  size="small"
                  checked={widget.italic ?? false}
                  onChange={e => onUpdate({ italic: e.target.checked })}
                />
              }
              label={<Typography variant="body2" sx={{ fontStyle: 'italic' }}>Italic</Typography>}
            />
          </Box>
          <Autocomplete
            size="small"
            freeSolo
            options={COMMON_FONTS}
            value={widget.fontFamily ?? ''}
            onInputChange={(_, v) => onUpdate({ fontFamily: v || undefined })}
            renderInput={params => (
              <TextField {...params} label="Font family" placeholder="default" />
            )}
            renderOption={(props, option) => (
              <li {...props} style={{ fontFamily: option, fontSize: '0.82rem' }}>{option}</li>
            )}
          />
        </Box>
      )}

      {/* ── Per-element text styles (sensor widgets) ──────────── */}
      {isSensorWidget(widget) && (
        <>
          {(widget.type === 'SensorBar' || widget.type === 'SensorSparkline' || widget.type === 'SensorGauge') && (
            <>
              <Divider />
              <AccentColorRow
                value={widget.accentColor ?? widget.color ?? (widget.type === 'SensorGauge' || widget.type === 'SensorBar' ? '#7c6ef5' : '#03dac6')}
                onChange={c => onUpdate({ accentColor: c })}
                visible={widget.showAccent ?? true}
                onVisibleChange={v => onUpdate({ showAccent: v })}
              />
            </>
          )}
          <Divider />
          <TextStyleSection
            title="Label"
            visible={widget.showLabel ?? true}
            onVisibleChange={v => onUpdate({ showLabel: v })}
            color={widget.labelColor ?? 'rgba(255,255,255,0.45)'}
            fontSize={widget.labelFontSize ?? (widget.type === 'SensorValue' || widget.type === 'SensorGauge' ? 10 : 11)}
            bold={widget.labelBold ?? false}
            fontFamily={widget.labelFontFamily ?? ''}
            italic={widget.labelItalic ?? false}
            onColorChange={c => onUpdate({ labelColor: c })}
            onFontSizeChange={s => onUpdate({ labelFontSize: s })}
            onBoldChange={b => onUpdate({ labelBold: b })}
            onFontFamilyChange={f => onUpdate({ labelFontFamily: f || undefined })}
            onItalicChange={i => onUpdate({ labelItalic: i })}
          />
          <Divider />
          <TextStyleSection
            title="Value"
            visible={widget.showValue ?? true}
            onVisibleChange={v => onUpdate({ showValue: v })}
            color={widget.color ?? (widget.type === 'SensorBar' || widget.type === 'SensorGauge' ? '#7c6ef5' : '#03dac6')}
            fontSize={widget.fontSize ?? (widget.type === 'SensorValue' ? 32 : widget.type === 'SensorGauge' ? 16 : 11)}
            bold={widget.valueBold ?? true}
            fontFamily={widget.valueFontFamily ?? ''}
            italic={widget.valueItalic ?? false}
            onColorChange={c => onUpdate({ color: c })}
            onFontSizeChange={s => onUpdate({ fontSize: s })}
            onBoldChange={b => onUpdate({ valueBold: b })}
            onFontFamilyChange={f => onUpdate({ valueFontFamily: f || undefined })}
            onItalicChange={i => onUpdate({ valueItalic: i })}
          />
          {(widget.type === 'SensorValue' || widget.type === 'SensorGauge') && (
            <>
              <Divider />
              <TextStyleSection
                title="Unit"
                visible={widget.showUnit ?? true}
                onVisibleChange={v => onUpdate({ showUnit: v })}
                color={widget.unitColor ?? 'rgba(255,255,255,0.45)'}
                fontSize={widget.unitFontSize ?? (widget.type === 'SensorGauge' ? 8 : Math.max(8, Math.round((widget.fontSize ?? 32) * 0.42)))}
                bold={widget.unitBold ?? false}
                fontFamily={widget.unitFontFamily ?? ''}
                italic={widget.unitItalic ?? false}
                onColorChange={c => onUpdate({ unitColor: c })}
                onFontSizeChange={s => onUpdate({ unitFontSize: s })}
                onBoldChange={b => onUpdate({ unitBold: b })}
                onFontFamilyChange={f => onUpdate({ unitFontFamily: f || undefined })}
                onItalicChange={i => onUpdate({ unitItalic: i })}
              />
            </>
          )}
        </>
      )}

      {/* ── Color (Text only — Clock has per-element styling above) */}
      {widget.type === 'Text' && (
        <ColorRow
          value={widget.color ?? '#ffffff'}
          onChange={c => onUpdate({ color: c })}
        />
      )}

      {/* ── Custom widget ─────────────────────────────────────────── */}
      {widget.type === 'Custom' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionLabel>Custom HTML Widget</SectionLabel>
          <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1.6 }}>
            Write any HTML / CSS / JS. XStat injects live sensor data via{' '}
            <code style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
              window.postMessage
            </code>{' '}
            on every poll tick.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            startIcon={<CodeIcon sx={{ fontSize: 16 }} />}
            onClick={() => window.xstat.widgetEditor.open(widget)}
            sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
          >
            Open Code Editor
          </Button>
        </Box>
      )}

      {/* ── Image widget ──────────────────────────────────────────── */}
      {widget.type === 'Image' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SectionLabel>Image</SectionLabel>

          {/* Preview */}
          {widget.imageDataUrl && (
            <Box
              component="img"
              src={widget.imageDataUrl}
              alt="preview"
              sx={{
                width: '100%', maxHeight: 120,
                objectFit: 'contain',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          )}

          {/* File picker */}
          <Button
            size="small"
            variant="outlined"
            fullWidth
            component="label"
            startIcon={<ImageIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
          >
            {widget.imageDataUrl ? 'Change Image…' : 'Select Image…'}
            <Box
              component="input"
              type="file"
              accept="image/*"
              sx={{ display: 'none' }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => onUpdate({ imageDataUrl: reader.result as string })
                reader.readAsDataURL(file)
                e.target.value = ''
              }}
            />
          </Button>

          {widget.imageDataUrl && (
            <Button
              size="small"
              variant="text"
              color="error"
              fullWidth
              sx={{ textTransform: 'none', justifyContent: 'flex-start', py: 0.25 }}
              onClick={() => onUpdate({ imageDataUrl: undefined })}
            >
              Remove Image
            </Button>
          )}

          {/* Object fit */}
          <Box>
            <SectionLabel>Size / Fit</SectionLabel>
            <ToggleButtonGroup
              size="small"
              exclusive
              fullWidth
              value={widget.imageObjectFit ?? 'contain'}
              onChange={(_, v) => { if (v) onUpdate({ imageObjectFit: v }) }}
              sx={{ '& .MuiToggleButton-root': { fontSize: '0.65rem', py: 0.5, textTransform: 'none' } }}
            >
              <ToggleButton value="contain">Contain</ToggleButton>
              <ToggleButton value="cover">Cover</ToggleButton>
              <ToggleButton value="fill">Fill</ToggleButton>
              <ToggleButton value="none">None</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Opacity */}
          <Box>
            <SectionLabel>Opacity — {Math.round((widget.imageOpacity ?? 1) * 100)}%</SectionLabel>
            <Box
              component="input"
              type="range"
              min={0}
              max={100}
              value={Math.round((widget.imageOpacity ?? 1) * 100)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onUpdate({ imageOpacity: Number(e.target.value) / 100 })
              }
              sx={{ width: '100%', accentColor: 'primary.main', cursor: 'pointer' }}
            />
          </Box>
        </Box>
      )}
    </Box>
  )
}
