# Building for Production

This guide explains how to produce a fully packaged, distributable XStat installer.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | |
| .NET SDK | 9.0 | |
| Windows | 10 / 11 | Build must run on Windows |
| PawnIO installer | Latest | Place at `src/app/resources/pawnio/PawnIO-Setup.exe` — download from [namazso/PawnIO releases](https://github.com/namazso/PawnIO/releases) |

> **PawnIO** is a signed kernel driver used by LibreHardwareMonitor to access hardware sensors on modern Windows versions. It must be bundled with the installer.

---

## Quick Build (recommended)

The `build.ps1` script at the repo root automates every step:

```powershell
# Run from the repo root (elevation not required for building, only for running)
.\build.ps1
```

What it does:

1. Kills any running XStat / Electron instances that could lock output files.
2. **Cleans** `dist/`, `dist-service/`, and intermediate Vite/Electron build caches.
3. **Publishes the .NET service** — `dotnet publish XStat.Service -r win-x64 --self-contained` → `dist-service/`.
4. **Builds the LAN web panel** — `npm run build:panel` → `XStat.Service/wwwroot/`.
5. **Packages the Electron app** — `npm run package` which runs `electron-vite build` then `electron-builder`.

Output files are placed in `dist/`:

```
dist/
├── win-unpacked/          # Unpacked app directory (useful for quick testing)
│   └── XStat.exe
└── XStat-Setup.exe        # NSIS installer
```

---

## Manual Step-by-Step Build

If you need to run steps individually:

### Step 1 — Publish the hardware service

```powershell
cd src/XStat.Service
dotnet publish -c Release -r win-x64 --self-contained -o ..\..\dist-service
```

### Step 2 — Build the LAN web panel

```powershell
cd src/app
npm run build:panel
```

### Step 3 — Build and package Electron

```powershell
cd src/app
npm run package
```

This runs `electron-vite build` (compiles TypeScript → `out/`) followed by `electron-builder` which:

- Bundles the compiled Electron app
- Copies `dist-service/` as the embedded service
- Generates the NSIS installer

---

## electron-builder Configuration

The builder is configured in `src/app/package.json` under the `"build"` key. Key settings:

| Setting | Value |
|---|---|
| appId | `com.inside4ndroid.xstat` |
| productName | `XStat` |
| win target | `nsis` |
| extraResources | `dist-service/` bundled as `resources/service/` |

---

## Versioning

The app version is driven by `"version"` in `src/app/package.json`. Update this before building a release:

```json
{ "version": "1.0.0" }
```

---

## Code Signing (optional)

To sign the installer, configure your certificate in `electron-builder.yml` or via environment variables:

```
CSC_LINK=path/to/cert.pfx
CSC_KEY_PASSWORD=yourpassword
```

Unsigned builds will show a Windows SmartScreen warning on first run.

---

## CI / GitHub Actions

A `release.yml` workflow file should be placed in `.github/workflows/` to automate builds on tag push. Example trigger:

```yaml
on:
  push:
    tags:
      - 'v*'
```

The workflow should call `.\build.ps1` on a `windows-latest` runner and upload `dist/XStat-Setup.exe` as a release artifact.
