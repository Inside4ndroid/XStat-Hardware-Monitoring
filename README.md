<p align="center">
  <img src="website-source/images/logo.png" alt="XStat Logo" width="120" />
</p>

<h1 align="center">XStat — Hardware Monitoring</h1>

<p align="center">
  Open-source real-time hardware monitoring and live sensor panel for Windows.
  <br />
  Built with Electron, React, and ASP.NET Core 9.
</p>

<p align="center">
  <a href="https://github.com/Inside4ndroid/XStat-Hardware-Monitoring/releases"><img alt="Latest Release" src="https://img.shields.io/github/v/release/Inside4ndroid/XStat-Hardware-Monitoring?color=7c6ef5&style=flat-square" /></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" /></a>
  <a href="https://github.com/Inside4ndroid/XStat-Hardware-Monitoring/issues"><img alt="Issues" src="https://img.shields.io/github/issues/Inside4ndroid/XStat-Hardware-Monitoring?style=flat-square" /></a>
  <img alt="Platform: Windows" src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" />
  <img alt=".NET 9" src="https://img.shields.io/badge/.NET-9-purple?style=flat-square" />
</p>

<p align="center">
  <a href="https://xstat.ddns.net">🌐 Website</a> ·
  <a href="docs/installation.md">📥 Install</a> ·
  <a href="docs/development.md">🛠 Develop</a> ·
  <a href="docs/architecture.md">🏗 Architecture</a> ·
  <a href="docs/widgets.md">🧩 Widgets</a>
</p>

---

## What is XStat?

XStat is a desktop hardware-monitoring application for Windows. It reads live sensor data — CPU temperature, GPU load, RAM usage, fan speeds, clock frequencies, and dozens more — and lets you build beautiful, fully custom display panels.

Panels run both inside the Electron desktop app **and** as a responsive web page served over your local network so any phone, tablet, or second monitor can show your sensor data in real time.

---

## Screenshots

**Dashboard** — live CPU & GPU sensor overview

![Dashboard](website-source/images/screenshots/Screenshot%202026-04-10%20132009.png)

**Panel Editor** — drag-and-drop widget canvas

![Panel Editor](website-source/images/screenshots/Screenshot%202026-04-10%20132022.png)

**Settings** — configurable port, poll interval, and LAN web panel QR code

![Settings](website-source/images/screenshots/Screenshot%202026-04-10%20132029.png)

**Custom Widget Editor** — full HTML/CSS/JS editor with Monaco and live preview

![Custom Widget Editor](website-source/images/screenshots/Screenshot%202026-04-10%20132354.png)

---

## Features

| Category | Highlights |
|---|---|
| **Real-time sensors** | CPU, GPU, RAM, Motherboard, Storage, Network — 291+ sensor channels |
| **Panel editor** | Drag-and-drop grid layout, resizable widgets, z-index layering |
| **Widget library** | Value, Bar, Sparkline, Gauge, Clock, Text, Image, Custom HTML |
| **Custom widgets** | Full HTML/CSS/JS editor with Monaco, live preview, sensor data injection |
| **LAN web panel** | Serve your panel to any device on your network — QR code included |
| **Per-element styling** | Individual colour, font, size, bold, italic controls per widget element |
| **Visibility toggles** | Toggle label / value / unit / accent on/off per widget |
| **Layer ordering** | Send to back, send backward, bring forward, bring to front |
| **Widget naming** | Click the widget name in Properties to rename inline |
| **Configurable port** | Change the service port from the Settings page — restarts automatically |
| **Multiple panels** | Create and switch between named panels |
| **Import / Export** | Export panel layouts as JSON; import on any machine |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) 33 + [electron-vite](https://electron-vite.org/) |
| UI framework | [React](https://react.dev/) 18 + [Material UI](https://mui.com/) 6 + TypeScript |
| Charts | [Recharts](https://recharts.org/) (AreaChart) |
| Grid layout | [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout) |
| Code editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| Hardware service | [ASP.NET Core 9](https://dotnet.microsoft.com/) + [LibreHardwareMonitorLib](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor) |
| Real-time push | [SignalR](https://learn.microsoft.com/aspnet/core/signalr/introduction) WebSocket hub |
| Windows service | `Microsoft.Extensions.Hosting.WindowsServices` |

---

## Quick Start

### Option A — Install the release build

1. Download the latest **XStat-Setup.exe** from [Releases](https://github.com/Inside4ndroid/XStat-Hardware-Monitoring/releases).
2. Run the installer — administrator rights are required so the hardware service can access sensor data.
3. XStat starts automatically and sits in the system tray.

See [docs/installation.md](docs/installation.md) for full details.

### Option B — Run from source

```powershell
# Prerequisites: Node.js 20+, .NET 9 SDK, Windows
git clone https://github.com/Inside4ndroid/XStat-Hardware-Monitoring.git
cd XStat-Hardware-Monitoring/src/app
npm install
npm run dev:admin      # launches Electron + .NET service (elevation prompt)
```

See [docs/development.md](docs/development.md) for full setup instructions.

---

## Project Structure

```
xstat/
├── src/
│   ├── app/                    # Electron + React frontend
│   │   ├── electron/           # main.ts, preload.ts
│   │   └── src/
│   │       ├── components/     # Shared UI components
│   │       ├── pages/          # Dashboard, PanelEditor, Settings, WidgetEditor
│   │       ├── panel/          # LAN web panel entry point
│   │       ├── hooks/          # useSensors, usePanelLayout, useAppSettings
│   │       └── types/          # TypeScript type definitions
│   └── XStat.Service/          # ASP.NET Core hardware service
│       ├── Controllers/        # REST API controllers
│       ├── Hardware/            # LibreHardwareMonitor wrapper
│       ├── Hubs/               # SignalR sensor hub
│       └── Services/           # SensorBroadcastService, PanelLayoutStore
├── website-source/             # Static marketing website (GitHub Pages)
├── docs/                       # Developer and user documentation
├── build.ps1                   # Full production build script
└── xstat.sln                   # Visual Studio solution
```

---

## Documentation

| Document | Description |
|---|---|
| [Installation Guide](docs/installation.md) | How to install and run XStat |
| [Development Setup](docs/development.md) | Set up a local dev environment |
| [Building for Production](docs/building.md) | Build the installer and service |
| [Architecture Overview](docs/architecture.md) | How the pieces fit together |
| [Widget Reference](docs/widgets.md) | All widget types documented |

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT © [Inside4ndroid Studios](https://github.com/Inside4ndroid) — see [LICENSE](LICENSE) for full text.

---

<p align="center">
  Made with ♥ by Inside4ndroid Studios
</p>
