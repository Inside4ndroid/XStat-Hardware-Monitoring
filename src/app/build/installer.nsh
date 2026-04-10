; XStat custom NSIS installer macros
; Included by electron-builder via nsis.include in package.json
;
; Service name must match UseWindowsService() in Program.cs → "XStat Hardware Service"
; but sc.exe names cannot have spaces as the key; we use "XStatHardwareSvc" as the sc key.

!define XSTAT_SVC_NAME   "XStatHardwareSvc"
!define XSTAT_SVC_DISPLAY "XStat Hardware Service"
!define XSTAT_SVC_DESC   "XStat hardware sensor data service (LibreHardwareMonitor + PawnIO)"
!define XSTAT_FW_RULE    "XStat Sensor Service (TCP 9421)"

; ── Called after files are written to $INSTDIR ─────────────────────────────
!macro customInstall

  ; ── PawnIO driver ──────────────────────────────────────────────────────────
  ; Try both common filename variants (setup vs installer name may differ by release)
  IfFileExists "$INSTDIR\resources\pawnio\PawnIO-Setup.exe" +3
  IfFileExists "$INSTDIR\resources\pawnio\PawnIO_setup.exe" +2 PawnIOSkip
  Goto PawnIOInstall
  Goto PawnIOInstall
  PawnIOInstall:
    ; Pick whichever exe exists
    IfFileExists "$INSTDIR\resources\pawnio\PawnIO-Setup.exe" 0 +3
      DetailPrint "Installing PawnIO kernel driver..."
      ExecWait '"$INSTDIR\resources\pawnio\PawnIO-Setup.exe" /S' $0
      Goto PawnIODone
    DetailPrint "Installing PawnIO kernel driver..."
    ExecWait '"$INSTDIR\resources\pawnio\PawnIO_setup.exe" /S' $0
  PawnIODone:
    ${If} $0 != 0
      DetailPrint "PawnIO installer returned code $0 (may already be installed)"
    ${EndIf}
  PawnIOSkip:

  ; ── Windows Service ────────────────────────────────────────────────────────
  DetailPrint "Stopping existing XStat service (if running)..."
  ExecWait 'sc.exe stop "${XSTAT_SVC_NAME}"' $0

  DetailPrint "Removing old service entry (if present)..."
  ExecWait 'sc.exe delete "${XSTAT_SVC_NAME}"' $0

  DetailPrint "Registering XStat hardware service..."
  ExecWait 'sc.exe create "${XSTAT_SVC_NAME}" \
    binPath= "$INSTDIR\resources\service\XStat.Service.exe" \
    DisplayName= "${XSTAT_SVC_DISPLAY}" \
    start= auto \
    obj= LocalSystem' $0
  ${If} $0 != 0
    MessageBox MB_ICONEXCLAMATION "Service registration failed (code $0). \
      Hardware sensor access may be limited."
  ${EndIf}

  ExecWait 'sc.exe description "${XSTAT_SVC_NAME}" "${XSTAT_SVC_DESC}"' $0

  DetailPrint "Starting XStat hardware service..."
  ExecWait 'sc.exe start "${XSTAT_SVC_NAME}"' $0

  ; ── Windows Firewall rule ──────────────────────────────────────────────────
  DetailPrint "Adding firewall rule for LAN panel access (TCP 9421)..."
  ExecWait 'netsh advfirewall firewall delete rule name="${XSTAT_FW_RULE}"' $0
  ExecWait 'netsh advfirewall firewall add rule \
    name="${XSTAT_FW_RULE}" \
    dir=in \
    action=allow \
    protocol=TCP \
    localport=9421 \
    profile=private \
    description="Allows LAN devices to view the XStat live sensor panel"' $0

!macroend

; ── Called during uninstall, before files are removed ──────────────────────
!macro customUnInstall

  DetailPrint "Stopping and removing XStat hardware service..."
  ExecWait 'sc.exe stop "${XSTAT_SVC_NAME}"' $0
  ExecWait 'sc.exe delete "${XSTAT_SVC_NAME}"' $0

  DetailPrint "Removing firewall rule..."
  ExecWait 'netsh advfirewall firewall delete rule name="${XSTAT_FW_RULE}"' $0

!macroend
