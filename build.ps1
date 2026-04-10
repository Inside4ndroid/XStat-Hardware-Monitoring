#Requires -Version 5.1
<#
.SYNOPSIS
  Full production build: publish service, build web panel, package Electron app.

.DESCRIPTION
  1. dotnet publish XStat.Service (win-x64, self-contained, to dist-service/)
  2. npm run build:panel  (Vite → wwwroot/)
  3. npm run package      (electron-vite build + electron-builder → dist/)

  Prerequisites:
  - Place PawnIO installer at: src/app/resources/pawnio/PawnIO-Setup.exe
    Download from: https://github.com/namazso/PawnIO/releases
  - .NET 9 SDK
  - Node.js 20+
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root       = $PSScriptRoot
$serviceDir = Join-Path $root 'src\XStat.Service'
$appDir     = Join-Path $root 'src\app'
$outService = Join-Path $root 'dist-service'

# Kill any running dev instances and build tools that will lock output files
Write-Host "Stopping any running XStat / Electron instances..." -ForegroundColor DarkGray
Stop-Process -Name "XStat","electron","XStat.Service","signtool","app-builder" -Force -ErrorAction SilentlyContinue

# Wipe the entire dist/ output folder so there are no stale locked files.
# Windows Defender can hold .asar handles for several seconds after a process exits.
$distDir = Join-Path $root 'dist'
if (Test-Path $distDir) {
    Write-Host "Clearing output dist\ folder..." -ForegroundColor DarkGray
    Remove-Item $distDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Give OS / AV time to release any residual handles before we write new files.
Start-Sleep -Seconds 2

Write-Host "`n=== 1/3  Publishing XStat.Service ===" -ForegroundColor Cyan
dotnet publish "$serviceDir" `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output "$outService" `
    -p:DebugType=none `
    -p:DebugSymbols=false
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }

Write-Host "`n=== 2/3  Building web panel ===" -ForegroundColor Cyan
Push-Location $appDir
try {
    npm run build:panel
    if ($LASTEXITCODE -ne 0) { throw "build:panel failed" }
} finally { Pop-Location }

Write-Host "`n=== 3/3  Packaging Electron app ===" -ForegroundColor Cyan
Push-Location $appDir
try {
    # Step A: compile JS bundles
    Write-Host "  Building JS bundles..." -ForegroundColor DarkGray
    npm run build:electron
    if ($LASTEXITCODE -ne 0) { throw "electron-vite build failed" }

    # Step B: stage the app to dist/win-unpacked.
    # electron-builder extracts the electron runtime here; Windows Defender may lock
    # app.asar briefly. Retry up to 3× with increasing back-off.
    Write-Host "  Staging app to dist\win-unpacked..." -ForegroundColor DarkGray
    $staged = $false
    for ($i = 1; $i -le 3; $i++) {
        npm run package:dir
        if ($LASTEXITCODE -eq 0) { $staged = $true; break }
        Write-Host "  Staging attempt $i failed (AV lock?), waiting ${i}s..." -ForegroundColor Yellow
        Start-Sleep -Seconds $i
        # Kill any lingering app-builder processes before retry
        Stop-Process -Name "app-builder" -Force -ErrorAction SilentlyContinue
    }
    if (-not $staged) { throw "electron-builder --dir failed after 3 attempts" }

    # Give AV / indexer time to finish scanning the newly extracted app.asar
    # before we ask electron-builder to read (not delete) it for NSIS packaging.
    Start-Sleep -Seconds 2

    # Step C: build NSIS installer from the pre-staged directory.
    # --prepackaged means electron is NOT re-extracted; only the installer is built.
    Write-Host "  Building NSIS installer..." -ForegroundColor DarkGray
    npm run package:nsis
    if ($LASTEXITCODE -ne 0) { throw "electron-builder NSIS failed" }
} finally { Pop-Location }

# ── 4/4  Create portable ZIP ───────────────────────────────────────────────
Write-Host "`n=== 4/4  Creating portable ZIP ===" -ForegroundColor Cyan
$version     = (Get-Content (Join-Path $appDir 'package.json') | ConvertFrom-Json).version
$unpacked    = Join-Path $root "dist\win-unpacked"
$portableZip = Join-Path $root "dist\XStat-Portable-$version.zip"

if (Test-Path $portableZip) { Remove-Item $portableZip -Force }
Compress-Archive -Path "$unpacked\*" -DestinationPath $portableZip -CompressionLevel Optimal
$sizeMB = [math]::Round((Get-Item $portableZip).Length / 1MB, 1)
Write-Host "  Portable: dist\XStat-Portable-$version.zip ($sizeMB MB)" -ForegroundColor DarkGray

Write-Host "`nBuild complete." -ForegroundColor Green
Write-Host "  Installer : dist\XStat Setup $version.exe" -ForegroundColor Green
Write-Host "  Portable  : dist\XStat-Portable-$version.zip" -ForegroundColor Green
