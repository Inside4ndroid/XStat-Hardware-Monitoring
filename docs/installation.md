# Installation Guide

This guide covers all methods for installing and running XStat on Windows.

---

## System Requirements

| Requirement | Details |
|---|---|
| **OS** | Windows 10 (64-bit) or Windows 11 |
| **Privileges** | Administrator — required to read hardware sensor data via LibreHardwareMonitor |
| **RAM** | 200 MB minimum |
| **Disk** | ~150 MB |
| **Network** | LAN access only (no internet required) |

---

## Option 1 — Installer (Recommended)

### 1. Download

Go to the [Releases page](https://github.com/Inside4ndroid/XStat-Hardware-Monitoring/releases) and download **`XStat-Setup.exe`** from the latest release.

### 2. Run the installer

Double-click `XStat-Setup.exe`. Windows may show a SmartScreen warning — click **"More info" → "Run anyway"** if you see it (the app is not yet code-signed).

The installer will:

- Install XStat to `%ProgramFiles%\XStat`
- Register `XStatHardwareSvc` as a Windows Service (runs as Local System for hardware access)
- Create a Start Menu shortcut
- Add an optional Desktop shortcut
- Configure a Windows startup entry (can be disabled)

### 3. First launch

XStat starts automatically after installation. Look for the **XStat icon in the system tray**. Double-click it to open the main window.

---

## Option 2 — Portable / No-Install

The `win-unpacked` folder from any release ZIP contains a fully portable copy:

1. Extract the ZIP anywhere.
2. Right-click `XStat.exe` → **Run as administrator** (required for sensor access).
3. XStat will start the hardware service internally.

---

## Option 3 — Run from Source

See [development.md](development.md) for full instructions. Short version:

```powershell
git clone https://github.com/Inside4ndroid/XStat-Hardware-Monitoring.git
cd XStat-Hardware-Monitoring/src/app
npm install
npm run dev:admin
```

---

## Uninstallation

- **Installed via NSIS**: Go to *Settings → Apps* (or *Control Panel → Programs*) and uninstall **XStat**.
- **Portable**: Delete the folder. Any config stored in `%APPDATA%\xstat\` can also be removed manually.

The Windows Service (`XStatHardwareSvc`) is automatically removed by the uninstaller.

---

## Firewall

The hardware service listens on **port 9421** (configurable in Settings). If your Windows Firewall blocks LAN access to the web panel, add an inbound rule for TCP 9421:

```powershell
# Run as administrator
netsh advfirewall firewall add rule `
  name="XStat Hardware Service" `
  dir=in action=allow protocol=TCP localport=9421
```

---

## Accessing the LAN Web Panel

Once XStat is running:

1. Open the XStat app and go to **Settings**.
2. The LAN panel section shows the URL (e.g. `http://192.168.1.128:9421`) and a QR code.
3. Open that URL on any phone, tablet, or other PC on the same network.

The panel automatically reconnects if the service restarts.

---

## Changing the Port

Open **Settings** in the XStat app, edit the **Service port** field, and click **Apply**. The service restarts automatically with the new port. The change is persisted to `%APPDATA%\xstat\xstat-config.json`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Sensors show `—` (no data) | Run as administrator |
| LAN panel unreachable | Check Windows Firewall — allow TCP on the configured port |
| Service won't start | Check Event Viewer → Windows Logs → Application for errors |
| App shows blank window | Update your graphics drivers; try disabling GPU acceleration in Electron |
| Old panel content on LAN | Hard-refresh the browser (`Ctrl+Shift+R`) |
