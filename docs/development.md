# Development Setup

This guide walks you through setting up a local development environment for XStat.

---

## Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| Windows | 10 / 11 | Required — hardware sensor access is Windows-only |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org/) |
| .NET SDK | 9.0 | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| Git | Any recent | |
| Administrator rights | — | The hardware service must run elevated to read sensor data |

---

## 1 — Clone & Install

```powershell
git clone https://github.com/Inside4ndroid/XStat-Hardware-Monitoring.git
cd XStat-Hardware-Monitoring

# Install Node dependencies for the Electron app
cd src/app
npm install
```

---

## 2 — Start the Development Server

XStat has two independent build targets that must both run during development:

### Electron app (Vite + React)

The `dev:admin` script launches the Vite dev server and the Electron shell together, prompting for administrator elevation so the hardware service can access sensors.

```powershell
# From src/app/
npm run dev:admin
```

This runs `dev-admin.ps1` from the repo root, which:

1. Re-launches the current PowerShell session elevated (UAC prompt)
2. Starts the .NET hardware service in the background (`XStat.Service.exe`)
3. Runs `electron-vite dev` which spins up the React Vite HMR server **and** the Electron window

### LAN web panel (separate Vite build)

The panel bundle (`src/app/` → `XStat.Service/wwwroot/`) must be rebuilt whenever you change panel-related React code and want the LAN panel to reflect those changes:

```powershell
# From src/app/
npm run build:panel
```

Then copy the built assets to the runtime wwwroot (only needed during local dev — the normal build copies automatically):

```powershell
$src = "c:\...\XStat.Service\wwwroot"
$dst = "c:\...\XStat.Service\bin\Debug\net9.0\wwwroot"
Remove-Item "$dst\*" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$src\*" $dst -Recurse -Force
```

---

## 3 — Project Layout

```
src/app/
├── electron/
│   ├── main.ts          # Main process — window management, IPC, service lifecycle
│   └── preload.ts       # Context bridge (exposes xstat.* to renderer)
└── src/
    ├── App.tsx           # Root router and layout
    ├── pages/
    │   ├── Dashboard.tsx        # Sensor overview (CPU, GPU, RAM, etc.)
    │   ├── PanelEditor.tsx      # Drag-and-drop panel builder
    │   ├── Settings.tsx         # App settings (port, poll interval, etc.)
    │   └── WidgetEditorPage.tsx # Custom HTML/CSS/JS widget editor window
    ├── components/
    │   ├── PanelCanvas.tsx      # Canvas renderer for all widgets
    │   ├── WidgetProperties.tsx # Right-panel property editor
    │   ├── WidgetPalette.tsx    # Left-panel widget picker
    │   ├── WidgetRenderer.tsx   # Widget type → component dispatch
    │   └── widgets/             # Individual widget implementations
    ├── panel/
    │   └── PanelApp.tsx         # LAN web panel React entry (separate Vite config)
    ├── hooks/
    │   ├── useSensors.ts        # SignalR sensor data subscription
    │   ├── usePanelLayout.ts    # Panel CRUD persisted via service API
    │   ├── useSensorHistory.ts  # Rolling history buffer for sparklines
    │   └── useAppSettings.ts   # LocalStorage + service config sync
    └── types/
        ├── panel.ts             # PanelWidget, WidgetType, PanelLayout
        ├── sensors.ts           # HardwareSnapshot, SensorValue
        └── electron.d.ts        # window.xstat bridge types
```

---

## 4 — Environment Variables

None are required. The service defaults to port **9421** which can be changed from the Settings page inside the app (persisted to `%APPDATA%/xstat/xstat-config.json`).

During dev the Electron main process looks for the service at `http://localhost:9421`. If a service is already running (e.g. from a previous dev session) it will reuse it rather than spawning a new one.

---

## 5 — Hot Reload Behaviour

| Change | Reload needed |
|---|---|
| React component (Electron renderer) | Instant HMR via Vite |
| Electron `main.ts` | Electron restarts automatically via electron-vite |
| Panel widget / `PanelApp.tsx` | Run `npm run build:panel` + copy wwwroot |
| `XStat.Service` C# code | Stop app, `dotnet build`, restart `npm run dev:admin` |

---

## 6 — Adding a New Widget Type

1. Add the type name to the `WidgetType` union in `src/types/panel.ts`.
2. Add a default size to `WIDGET_DEFAULTS` in the same file.
3. Create `src/components/widgets/MyWidget.tsx` implementing `React.FC<{ widget: PanelWidget; snapshot: HardwareSnapshot | null }>`.
4. Register it in `WidgetPalette.tsx` (palette list) and `WidgetRenderer.tsx` (switch/case).
5. Add property controls to `WidgetProperties.tsx` as needed.

---

## 7 — Linting & Type Checks

```powershell
cd src/app
npx tsc --noEmit        # TypeScript type check (no output)
npx eslint src          # Linting (if ESLint is configured)
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Access denied" on sensor read | Not running elevated | Use `npm run dev:admin` |
| LAN panel shows old content | wwwroot not updated | Run `npm run build:panel` + copy |
| Electron window blank | Vite server not started | Wait for "ready" log or restart |
| Port already in use | Previous service running | Kill `XStat.Service.exe` in Task Manager |
