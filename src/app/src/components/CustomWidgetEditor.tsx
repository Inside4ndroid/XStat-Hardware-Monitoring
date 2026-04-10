import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, alpha,
  Popover, List, ListSubheader, ListItemButton, ListItemText, Tooltip, Chip,
} from '@mui/material'
import CloseIcon        from '@mui/icons-material/Close'
import PlayArrowIcon    from '@mui/icons-material/PlayArrow'
import SensorsIcon      from '@mui/icons-material/Sensors'
import ContentCopyIcon  from '@mui/icons-material/ContentCopy'
import CheckIcon        from '@mui/icons-material/Check'
import FolderOpenIcon   from '@mui/icons-material/FolderOpen'
import AddIcon          from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import '@/monacoEnv'
import Editor from '@monaco-editor/react'
import type { PanelWidget } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'
import { CUSTOM_DEFAULT_HTML } from '@/hooks/usePanelLayout'

interface Props {
  open: boolean
  widget: PanelWidget
  snapshot: HardwareSnapshot | null
  onSave:  (html: string, files: Record<string, string>) => void
  onClose: () => void
  /** When true, renders fullscreen (for a dedicated Electron window) instead of a Dialog */
  standalone?: boolean
}

/**
 * Replace static ./data/{filename} occurrences with their data URLs, and inject
 * a tiny bootstrap so window.__xstatFiles is populated at runtime via postMessage
 * (avoids embedding megabytes of base64 directly in srcDoc).
 */
function applyFiles(html: string, files: Record<string, string>): string {
  const entries = Object.entries(files)
  if (entries.length === 0) return html

  // 1. Replace static ./data/{filename} references (CSS background-image, img src, etc.)
  let result = html
  for (const [name, dataUrl] of entries) {
    result = result.split(`./data/${name}`).join(dataUrl)
  }

  // 2. Inject bootstrap: patches img.src + style.backgroundImage setters so ./data/ paths
  //    resolve transparently at runtime. Uses no regex — template literals strip backslashes.
  //    window.__xstatFiles is populated via postMessage after the iframe loads.
  const bootstrap = '<script>(function(){'
    + 'window.__xstatFiles={};'
    + 'try{'
    +   'var sd=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");'
    +   'if(sd&&sd.set){'
    +     'Object.defineProperty(HTMLImageElement.prototype,"src",{'
    +       'get:sd.get,'
    +       'set:function(v){'
    +         'if(typeof v==="string"&&v.indexOf("./data/")===0){var f=window.__xstatFiles[v.slice(7)];if(f){sd.set.call(this,f);return;}}'
    +         'sd.set.call(this,v);'
    +       '},configurable:true'
    +     '});'
    +   '}'
    + '}catch(e){}'
    + 'try{'
    +   'var bd=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,"backgroundImage");'
    +   'if(bd&&bd.set){'
    +     'Object.defineProperty(CSSStyleDeclaration.prototype,"backgroundImage",{'
    +       'get:bd.get,'
    +       'set:function(v){'
    +         'if(typeof v==="string"&&v.indexOf("./data/")!==-1){'
    +           'var i=v.indexOf("./data/"),e,fn,f;'
    +           'while(i!==-1){'
    +             'e=v.indexOf(")",i);if(e===-1)break;'
    +             'fn=v.slice(i+7,e).split(\'"\').join("").split("\'").join("").trim();'
    +             'f=window.__xstatFiles[fn];'
    +             'if(f){v=v.slice(0,i)+f+v.slice(e);}'
    +             'i=v.indexOf("./data/",i+(f?f.length:1));'
    +           '}'
    +         '}'
    +         'bd.set.call(this,v);'
    +       '},configurable:true'
    +     '});'
    +   '}'
    + '}catch(e){}'
    + 'window.addEventListener("message",function(e){if(e.data&&e.data.files)Object.assign(window.__xstatFiles,e.data.files);},false);'
    + '})();<\/script>'
  if (result.includes('</head>')) {
    result = result.replace('</head>', bootstrap + '</head>')
  } else if (result.includes('<body')) {
    result = result.replace(/<body[^>]*>/, m => m + bootstrap)
  } else {
    result = bootstrap + result
  }

  return result
}

export const CustomWidgetEditor: React.FC<Props> = ({ open, widget, snapshot, onSave, onClose, standalone }) => {
  const [html,        setHtml]        = useState(widget.customHtml ?? CUSTOM_DEFAULT_HTML)
  const [previewHtml, setPreviewHtml] = useState(html)
  const [files,       setFiles]       = useState<Record<string, string>>(widget.customFiles ?? {})
  const [sensorsAnchor, setSensorsAnchor] = useState<HTMLElement | null>(null)
  const [filesAnchor,   setFilesAnchor]   = useState<HTMLElement | null>(null)
  const [copiedName,    setCopiedName]    = useState<string | null>(null)
  const [saved,         setSaved]         = useState(false)
  const iframeRef   = useRef<HTMLIFrameElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Re-seed editor + preview whenever the dialog opens for a widget
  useEffect(() => {
    if (open) {
      const h = widget.customHtml ?? CUSTOM_DEFAULT_HTML
      const f = widget.customFiles ?? {}
      setHtml(h)
      setFiles(f)
      setPreviewHtml(applyFiles(h, f))
    }
  }, [open, widget.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Forward sensor data to the preview iframe whenever snapshot updates
  useEffect(() => {
    const win = iframeRef.current?.contentWindow
    if (!win || !snapshot) return
    win.postMessage({ sensors: snapshot.sensors }, '*')
  }, [snapshot, previewHtml])

  const handleEditorChange = useCallback((value?: string) => {
    const v = value ?? ''
    setHtml(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setPreviewHtml(applyFiles(v, files)), 450)
  }, [files])

  const handleSave = () => {
    onSave(html, files)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const handleRun  = () => { if (debounceRef.current) clearTimeout(debounceRef.current); setPreviewHtml(applyFiles(html, files)) }

  // ── File management ───────────────────────────────────────────────────────
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    Array.from(fileList).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setFiles(prev => ({ ...prev, [file.name]: reader.result as string }))
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleDeleteFile = (name: string) => {
    setFiles(prev => { const next = { ...prev }; delete next[name]; return next })
  }

  // Re-apply files to preview whenever the file list changes
  useEffect(() => {
    setPreviewHtml(applyFiles(html, files))
  }, [files]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopySensor = (name: string) => {
    navigator.clipboard.writeText(name).then(() => {
      setCopiedName(name)
      setTimeout(() => setCopiedName(null), 1500)
    })
  }

  // Group sensors by hardwareName for the popover list
  const sensorGroups = snapshot
    ? snapshot.sensors.reduce<Record<string, typeof snapshot.sensors>>((acc, s) => {
        ;(acc[s.hardwareName] ??= []).push(s)
        return acc
      }, {})
    : {}

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={standalone}
      PaperProps={{
        sx: standalone
          ? { width: '100vw', height: '100vh', maxHeight: '100vh', m: 0, borderRadius: 0, background: '#0f0f11', display: 'flex', flexDirection: 'column' }
          : { width: '92vw', height: '88vh', maxHeight: '88vh', background: '#0f0f11', display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* ─── Title bar ─────────────────────────────────────────────── */}
      <Box sx={{
        px: 2, py: 1.25,
        display: 'flex', alignItems: 'center', gap: 1,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
          Custom Widget Editor
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SensorsIcon sx={{ fontSize: 16 }} />}
          onClick={e => setSensorsAnchor(e.currentTarget)}
          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
        >
          Sensors
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FolderOpenIcon sx={{ fontSize: 16 }} />}
          onClick={e => setFilesAnchor(e.currentTarget)}
          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
        >
          Files {Object.keys(files).length > 0 && `(${Object.keys(files).length})`}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
          onClick={handleRun}
          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
        >
          Run
        </Button>
        <IconButton size="small" onClick={onClose} sx={{ ml: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ─── Hidden file picker ─────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesSelected}
      />

      {/* ─── Sensors popover ───────────────────────────────────────── */}
      <Popover
        open={Boolean(sensorsAnchor)}
        anchorEl={sensorsAnchor}
        onClose={() => setSensorsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            width: 320, maxHeight: 420,
            background: '#1a1a1e',
            border: '1px solid rgba(255,255,255,0.09)',
            overflowY: 'auto',
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Available Sensors
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>
            Click a name to copy it to clipboard
          </Typography>
        </Box>

        {Object.keys(sensorGroups).length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              No sensor data yet — waiting for first snapshot.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {Object.entries(sensorGroups).map(([hw, sensors]) => (
              <React.Fragment key={hw}>
                <ListSubheader disableSticky sx={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: '0.68rem',
                  lineHeight: '28px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {hw}
                </ListSubheader>
                {sensors.map(s => {
                  const copied = copiedName === s.name
                  return (
                    <Tooltip key={s.id} title={copied ? 'Copied!' : `${s.value ?? '—'} ${s.unit}`} placement="right" arrow>
                      <ListItemButton
                        dense
                        onClick={() => handleCopySensor(s.name)}
                        sx={{
                          py: 0.4, px: 2,
                          '&:hover': { background: alpha('#ffffff', 0.05) },
                        }}
                      >
                        <ListItemText
                          primary={s.name}
                          primaryTypographyProps={{
                            fontSize: '0.8rem',
                            color: copied ? 'primary.main' : 'text.primary',
                            fontFamily: 'monospace',
                          }}
                        />
                        <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label={s.type}
                            size="small"
                            sx={{
                              height: 16, fontSize: '0.6rem',
                              color: 'rgba(255,255,255,0.4)',
                              background: 'rgba(255,255,255,0.07)',
                            }}
                          />
                          {copied
                            ? <CheckIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                            : <ContentCopyIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }} />
                          }
                        </Box>
                      </ListItemButton>
                    </Tooltip>
                  )
                })}
              </React.Fragment>
            ))}
          </List>
        )}
      </Popover>

      {/* ─── Files popover ─────────────────────────────────────────── */}
      <Popover
        open={Boolean(filesAnchor)}
        anchorEl={filesAnchor}
        onClose={() => setFilesAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            width: 340,
            background: '#1a1a1e',
            border: '1px solid rgba(255,255,255,0.09)',
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Widget Files
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.3)', mt: 0.25 }}>
            Reference files in your HTML as <code style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3 }}>{'./data/{filename}'}</code>
          </Typography>
        </Box>

        {/* File list */}
        {Object.keys(files).length === 0 ? (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              No files added yet — click Add Files to upload.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
            {Object.keys(files).map(name => {
              const ext = name.split('.').pop()?.toLowerCase() ?? ''
              const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)
              return (
                <Box
                  key={name}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 2, py: 0.75,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    '&:hover': { background: 'rgba(255,255,255,0.03)' },
                  }}
                >
                  {isImage ? (
                    <Box
                      component="img"
                      src={files[name]}
                      sx={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 0.5, flexShrink: 0 }}
                    />
                  ) : (
                    <InsertDriveFileIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  )}
                  <Tooltip title={`./data/${name}`} placement="top" arrow>
                    <Typography
                      variant="caption"
                      sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}
                    >
                      {name}
                    </Typography>
                  </Tooltip>
                  <Tooltip title="Remove file" arrow>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteFile(name)}
                      sx={{ color: 'error.main', opacity: 0.6, '&:hover': { opacity: 1 }, p: 0.25 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )
            })}
          </Box>
        )}

        <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4 }}
          >
            Add Files
          </Button>
        </Box>
      </Popover>

      {/* ─── Split pane ────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0, display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left — Monaco editor */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <Box sx={{ px: 2, py: 0.6, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              HTML / CSS / JS
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language="html"
              value={html}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 10, bottom: 10 },
                tabSize: 2,
                renderLineHighlight: 'line',
              }}
            />
          </Box>
        </Box>

        {/* Right — live preview */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ px: 2, py: 0.6, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>
              Live Preview
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>
              auto-updates · 450 ms debounce
            </Typography>
          </Box>
          <Box sx={{ flex: 1, background: '#0d0d10', position: 'relative', overflow: 'hidden' }}>
            <iframe
              ref={iframeRef}
              key={previewHtml}        /* remount to force srcdoc reload */
              sandbox="allow-scripts"
              srcDoc={previewHtml}
              onLoad={() => {
                const win = iframeRef.current?.contentWindow
                if (!win) return
                // Send files ONCE on load so window.__xstatFiles is populated;
                // subsequent sensor updates skip files to keep messages small.
                win.postMessage({ sensors: snapshot?.sensors ?? [], files }, '*')
              }}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title="custom-widget-preview"
            />
          </Box>
        </Box>
      </DialogContent>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 2, py: 1.25, borderTop: '1px solid rgba(255,255,255,0.07)', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            {'window.addEventListener("message", e => { const sensors = e.data.sensors; ... })'}
          </Typography>
        </Box>
        <Button onClick={onClose} size="small" sx={{ color: 'text.secondary', textTransform: 'none' }}>
          Close
        </Button>
        <Button
          onClick={handleSave}
          size="small"
          variant="contained"
          color={saved ? 'success' : 'primary'}
          sx={{ textTransform: 'none', minWidth: 72, transition: 'background-color 0.2s' }}
        >
          {saved ? 'Saved ✓' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
