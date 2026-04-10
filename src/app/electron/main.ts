import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  Tray,
  nativeImage,
} from 'electron'
import { join, resolve } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { networkInterfaces } from 'os'
import { readFileSync, writeFileSync } from 'fs'

// ── Persistent config ─────────────────────────────────────────────────────────
function configPath(): string { return join(app.getPath('userData'), 'xstat-config.json') }
interface AppConfig { port: number }
function readAppConfig(): AppConfig {
  try { return JSON.parse(readFileSync(configPath(), 'utf8')) as AppConfig } catch { return { port: 9421 } }
}
function writeAppConfig(cfg: AppConfig): void {
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2))
}

let SERVICE_PORT = readAppConfig().port
let SERVICE_URL  = `http://localhost:${SERVICE_PORT}`
const IS_DEV       = !app.isPackaged

let mainWindow:     BrowserWindow | null = null
let tray:           Tray | null = null
let serviceProcess: ChildProcess | null = null
let widgetEditorWindow: BrowserWindow | null = null
let widgetEditorData:   unknown = null

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Hardware Service Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function startService(): Promise<void> {
  // 1. Reuse an already-running service (e.g. Windows Service or manually launched in dev)
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 2000)
    const probe = await fetch(SERVICE_URL + '/health', { signal: controller.signal })
    clearTimeout(tid)
    if (probe.ok) {
      const json = await probe.json() as { isAdmin?: boolean }
      if (json.isAdmin !== false) {
        console.log('[XStat] Reusing existing elevated service on', SERVICE_URL)
        return
      }
      console.warn('[XStat] Found non-elevated service — stopping it and spawning elevated version.')
    }
  } catch { /* not running — fall through */ }

  // 2. In production try to start the registered Windows Service first.
  //    The NSIS installer registers 'XStatHardwareSvc' running as LocalSystem.
  if (!IS_DEV) {
    console.log('[XStat] Attempting to start Windows service...')
    await new Promise<void>((resolve) => {
      const sc = spawn('sc.exe', ['start', 'XStatHardwareSvc'], { stdio: 'ignore' })
      sc.on('exit', () => resolve())
      sc.on('error', () => resolve())
    })
    await waitForService(SERVICE_URL + '/health', 8000)
    try {
      const r = await fetch(SERVICE_URL + '/health')
      if (r.ok) { console.log('[XStat] Windows service is running.'); return }
    } catch { /* fall through to spawn */ }
    console.warn('[XStat] Windows service did not respond — falling back to direct spawn.')
  }

  // 3. Fall back: spawn service exe directly (dev mode or service not installed).
  const exeName = IS_DEV
    ? resolve(__dirname, '../../../XStat.Service/bin/Debug/net9.0/XStat.Service.exe')
    : join(process.resourcesPath, 'service', 'XStat.Service.exe')

  console.log('[XStat] Starting hardware service:', exeName)
  serviceProcess = spawn(exeName, [`--urls=http://0.0.0.0:${SERVICE_PORT}`], { detached: false, stdio: 'inherit' })
  serviceProcess.on('error', (err) => console.error('[XStat] Service error:', err.message))
  serviceProcess.on('exit',  (code) => { console.log('[XStat] Service exited:', code); serviceProcess = null })

  await waitForService(SERVICE_URL + '/health', 15000)
}async function waitForService(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) { console.log('[XStat] Service is ready.'); return }
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  console.warn('[XStat] Service did not respond in time Ã¢â‚¬â€ continuing anyway.')
}

function stopService() {
  if (serviceProcess && !serviceProcess.killed) {
    serviceProcess.kill()
    serviceProcess = null
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Window Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f0f11',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: join(__dirname, '../../public/icon.ico'),
  })

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Tray Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function createTray() {
  const icon = nativeImage.createFromPath(join(__dirname, '../../public/icon.ico'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('XStat')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show XStat',          click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Open Panel in Browser', click: () => shell.openExternal(`${SERVICE_URL}/panel`) },
    { type: 'separator' },
    { label: 'Quit',                click: () => app.quit() },
  ]))
  tray.on('double-click', () => mainWindow?.show())
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ IPC handlers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close',  () => mainWindow?.hide())
ipcMain.handle('app:quit',      () => { stopService(); app.exit(0) })
ipcMain.handle('service:url',      () => SERVICE_URL)
ipcMain.handle('service:getPort',  () => SERVICE_PORT)
ipcMain.handle('service:setPort',  async (_event, port: number) => {
  port = Math.max(1024, Math.min(65535, Math.floor(port)))
  writeAppConfig({ port })
  SERVICE_PORT = port
  SERVICE_URL  = `http://localhost:${port}`
  stopService()
  await startService()
  return port
})
ipcMain.handle('service:panelUrl', () => {
  const nets = networkInterfaces()
  for (const iface of Object.values(nets)) {
    if (!iface) continue
    for (const net of iface) {
      if (!net.internal && net.family === 'IPv4') {
        return `http://${net.address}:${SERVICE_PORT}`
      }
    }
  }
  return `http://localhost:${SERVICE_PORT}`
})

// ── Widget Editor window ──────────────────────────────────────────────────

ipcMain.handle('widget-editor:open', (_event, widget: unknown) => {
  widgetEditorData = widget

  // If the window is already open, just refresh it with the new widget data
  if (widgetEditorWindow && !widgetEditorWindow.isDestroyed()) {
    widgetEditorWindow.webContents.send('widget-editor:init', widget)
    widgetEditorWindow.focus()
    return
  }

  widgetEditorWindow = new BrowserWindow({
    width:    1400,
    height:   900,
    minWidth: 900,
    minHeight: 600,
    title: 'Custom Widget Editor — XStat',
    backgroundColor: '#0f0f11',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: join(__dirname, '../../public/icon.ico'),
  })

  if (IS_DEV) {
    widgetEditorWindow.loadURL('http://localhost:5173/#/widget-editor')
  } else {
    widgetEditorWindow.loadFile(join(__dirname, '../../dist/index.html'), { hash: '/widget-editor' })
  }

  widgetEditorWindow.once('ready-to-show', () => {
    widgetEditorWindow?.setMenu(null)
    widgetEditorWindow?.show()
  })
  widgetEditorWindow.on('closed', () => { widgetEditorWindow = null })
})

ipcMain.handle('widget-editor:get-data', () => widgetEditorData)

ipcMain.handle('widget-editor:save', (_event, html: string, files: Record<string, string>) => {
  const widget = widgetEditorData as { id?: string } | null
  mainWindow?.webContents.send('widget-editor:saved', { widgetId: widget?.id ?? '', html, files })
})

ipcMain.handle('widget-editor:close',    () => widgetEditorWindow?.close())
ipcMain.handle('widget-editor:minimize', () => widgetEditorWindow?.minimize())
ipcMain.handle('widget-editor:maximize', () => {
  if (widgetEditorWindow?.isMaximized()) widgetEditorWindow.unmaximize()
  else widgetEditorWindow?.maximize()
})

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ App lifecycle Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

app.whenReady().then(async () => {
  await startService()
  createMainWindow()
  createTray()
})

app.on('window-all-closed', () => { /* tray-based - do not quit */ })

app.on('before-quit', () => {
  mainWindow?.removeAllListeners('close')
  stopService()
})

app.on('activate', () => {
  if (mainWindow === null) createMainWindow()
  else mainWindow.show()
})
