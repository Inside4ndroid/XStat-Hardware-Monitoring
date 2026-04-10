# dev-admin.ps1 - Launch xstat dev environment as Administrator
# Run this once; it will UAC-prompt and restart everything elevated.

$appDir = Join-Path $PSScriptRoot "src\app"
$node   = (Get-Command node -ErrorAction Stop).Source
$cli    = Join-Path $appDir "node_modules\electron-vite\dist\cli.mjs"

if (-not (Test-Path $cli)) {
    Write-Error "electron-vite not found. Run npm install inside src\app first."
    exit 1
}

# Check if already elevated
$id        = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [System.Security.Principal.WindowsPrincipal]$id
$isAdmin   = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    # ---- PawnIO: install if missing ----
    # PawnIO is a signed kernel driver (HVCI-compatible) that replaces WinRing0.
    # LHM 0.9.6+ uses it automatically once the service is running.
    $pawnioSvc = Get-Service -Name "PawnIO" -ErrorAction SilentlyContinue
    if (-not $pawnioSvc) {
        Write-Host "PawnIO kernel driver not found - installing via winget..." -ForegroundColor Cyan
        winget install namazso.PawnIO --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PawnIO installed. AMD CPU/GPU sensor data now available." -ForegroundColor Green
        } else {
            Write-Warning "PawnIO install returned exit code $LASTEXITCODE - sensor data may be limited."
        }
    } else {
        Write-Host "PawnIO driver already installed (status: $($pawnioSvc.Status))." -ForegroundColor Green
    }

    # ---- Kill any stale processes then launch ----
    Stop-Process -Name "electron","XStat.Service" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    Write-Host "Starting dev server..." -ForegroundColor Green
    Set-Location $appDir
    & $node $cli dev
} else {
    Write-Host "Relaunching as Administrator (UAC prompt)..." -ForegroundColor Yellow
    # Re-invoke this same script elevated - it will handle PawnIO and then launch.
    Start-Process powershell `
        -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`"" `
        -Verb RunAs
}
