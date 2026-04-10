# Architecture Overview

XStat is composed of two independent processes that communicate over HTTP and WebSockets.

```
┌─────────────────────────────────────────────────────┐
│                  Electron Shell                      │
│                                                     │
│  ┌──────────────────┐      ┌─────────────────────┐  │
│  │  Main Process    │      │  Renderer Process   │  │
│  │  (Node / main.ts)│ IPC  │  (React + Vite)     │  │
│  │                  │◄────►│                     │  │
│  │  • Window mgmt   │      │  • Dashboard        │  │
│  │  • Service spawn │      │  • Panel Editor     │  │
│  │  • Port config   │      │  • Settings         │  │
│  │  • System tray   │      │  • Widget Editor    │  │
│  └──────────────────┘      └──────────┬──────────┘  │
└─────────────────────────────────────── │ ────────────┘
                                         │ HTTP / SignalR
                             ┌───────────▼──────────────┐
                             │   XStat.Service           │
                             │   ASP.NET Core 9          │
                             │                           │
                             │  • LibreHardwareMonitor   │
                             │  • SignalR hub /hubs/     │
                             │  • REST API /api/         │
                             │  • Static wwwroot (panel) │
                             │  • Kestrel 0.0.0.0:9421   │
                             └───────────────────────────┘
                                         │
                             ┌───────────▼──────────────┐
                             │   LAN Browser             │
                             │   (phone / tablet / PC)   │
                             │   http://192.168.x.x:9421 │
                             └───────────────────────────┘
```

---

## Electron Main Process (`src/app/electron/main.ts`)

Responsibilities:
- **Service lifecycle** — probes `http://localhost:{port}/health`, tries to start a registered Windows Service, falls back to spawning the `.exe` directly.
- **Window management** — main window (custom frame, hidden titlebar) and a detached widget editor window.
- **IPC handlers** — exposes `service:url`, `service:getPort`, `service:setPort`, `service:panelUrl`, `window:*`, `app:quit`, and `widget-editor:*` channels.
- **Port config** — reads/writes `%APPDATA%\xstat\xstat-config.json`. On port change the service is stopped and restarted with the new port passed as `--urls=http://0.0.0.0:{port}`.
- **System tray** — shows icon with Show/Quit menu items; closing the main window hides it rather than quitting.

## Preload (`src/app/electron/preload.ts`)

Bridges the main process to the renderer via `contextBridge.exposeInMainWorld('xstat', { ... })`. The renderer never has direct Node access — all native operations go through the typed `window.xstat` API.

---

## Renderer (React App)

### Routing (`src/app/src/App.tsx`)

| Route | Page | Description |
|---|---|---|
| `/` | `Dashboard` | Sensor overview panels (CPU, GPU, RAM, etc.) |
| `/panel-editor` | `PanelEditor` | Drag-and-drop panel builder |
| `/settings` | `Settings` | App configuration |
| `/widget-editor` | `WidgetEditorPage` | Custom widget HTML/CSS/JS editor (rendered in separate window) |

### Key Hooks

| Hook | Location | Purpose |
|---|---|---|
| `useSensors` | `hooks/useSensors.ts` | Subscribes to the SignalR`SensorHub`, provides live `HardwareSnapshot` |
| `useSensorHistory` | `hooks/useSensorHistory.ts` | Maintains a rolling history buffer keyed by `sensorId` for sparkline charts |
| `usePanelLayout` | `hooks/usePanelLayout.ts` | CRUD for panel layouts; persisted via `PUT /api/panels` |
| `useAppSettings` | `hooks/useAppSettings.ts` | Poll interval; synced to `localStorage` + `PUT /api/config` |

### Panel Widget System

```
WidgetType  →  WIDGET_DEFAULTS  →  makeDefaultWidget()
     ↓
WidgetPalette   (drag source, left sidebar)
     ↓
PanelCanvas     (React Grid Layout grid, applies z-index)
     ↓
WidgetRenderer  (switch on widget.type)
     ↓
SensorValueWidget | SensorBarWidget | SensorGaugeWidget |
SensorSparklineWidget | ClockWidget | TextWidget |
ImageWidget | CustomWidget
```

All widget components receive `{ widget: PanelWidget; snapshot: HardwareSnapshot | null; history: Map<string, HistoryPoint[]> }`.

---

## Hardware Service (`src/XStat.Service/`)

### Startup (`Program.cs`)

- Reads `ServicePort` from `appsettings.json` (default 9421) or from the `--urls` CLI argument.
- Supports running as a Windows Service (`UseWindowsService`) or as a console app.
- Kestrel listens on `0.0.0.0:{port}` so LAN browsers can reach it.

### Hardware Layer (`Hardware/HardwareMonitor.cs`)

- Wraps `LibreHardwareMonitorLib`.
- Provides `GetSnapshot()` which returns a `HardwareSnapshot` with all current sensor values.
- Runs under elevated privileges (Local System in service mode) to access privileged sensors.

### Real-time Push (`Hubs/SensorHub.cs`, `Services/SensorBroadcastService.cs`)

- `SensorBroadcastService` polls hardware at the configured interval and sends snapshots to all connected SignalR clients via `SensorHub`.
- Clients subscribe by calling `connection.on('SensorUpdate', callback)`.

### REST API (`Controllers/`)

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness probe; reports `isAdmin` flag |
| `/api/sensors` | GET | One-shot sensor snapshot (JSON) |
| `/api/panels` | GET / PUT | Panel layout storage (file-backed JSON) |
| `/api/config` | PUT | Update poll interval at runtime |

### LAN Web Panel (`wwwroot/`)

A separately-built React/Vite bundle (`npm run build:panel`) that is served as static files from Kestrel. `PanelApp.tsx` uses WebSockets (SignalR) to receive live sensor data and renders the active panel layout using the same widget renderer as the desktop app.

---

## Data Flow

```
LibreHardwareMonitor
        │  poll every N ms
        ▼
SensorBroadcastService
        │  SignalR broadcast
    ┌───┴───────────────────────┐
    ▼                           ▼
Electron Renderer           LAN Browser
(useSensors hook)           (PanelApp)
        │                       │
    HardwareSnapshot        HardwareSnapshot
        │                       │
    Widget renderers        Widget renderers
        │                       │
    Live panel display      Live panel display
```

---

## Security Considerations

- The service listens on all interfaces (`0.0.0.0`) intentionally — this is required for LAN panel access.
- CORS is restricted to `localhost`, Electron renderer (`file://`/`null`), and private IP ranges only.
- No authentication is implemented; the service should only be exposed on a trusted local network.
- The Electron renderer runs with `contextIsolation: true` and `nodeIntegration: false` — all Node access is via the typed preload bridge.
