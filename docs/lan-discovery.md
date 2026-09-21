# LAN discovery diagnostics

XStat announces ASCII `XSTAT_HERE:<HTTP port>` on UDP 47210 every two seconds.
The Android companion uses the UDP source IPv4 address, never a desktop-selected
address embedded in the payload. The first valid announcement wins. Discovery
is not authentication; use a trusted LAN.

```mermaid
sequenceDiagram
    participant W as Windows service
    participant A as Android discovery
    participant V as Android WebView
    W->>W: Start HTTP listener on all IPv4 interfaces
    loop Every 2 seconds after ApplicationStarted
        W-->>A: Per-subnet broadcast: XSTAT_HERE:port (UDP 47210)
    end
    A->>A: Validate message; use source IPv4 and advertised port
    A->>V: http://source:port
    V->>W: GET / (panel), then SignalR /hubs/sensors
    loop While activity is visible
        V->>W: GET /health
    end
    V->>A: Rediscover after three failed health checks
```

The Windows sender binds each active non-loopback, non-tunnel IPv4 address and
uses its subnet broadcast address. Virtual Ethernet adapters are not excluded by
name: physical adapters still receive their own send, and bridged virtual LANs
remain supported. /31 and /32 interfaces do not have a usable broadcast subnet.
Adapter addresses are refreshed every cycle. This preserves the payload and
listening port used by older companions; the destination is now each subnet's
broadcast address instead of a single route-selected 255.255.255.255 send.

## Android

Open `android-companion` in Android Studio, select a Gradle-compatible JDK
(JDK 21 was used for validation), sync, choose the debug variant and Run.
Release signing is optional for debug builds. Do not commit local.properties,
keystores, SDK paths, or generated APKs.

```powershell
.\gradlew.bat testDebugUnitTest assembleDebug assembleDebugAndroidTest lintDebug
# Requires a connected device/emulator; no Windows sensor service is needed:
.\gradlew.bat connectedDebugAndroidTest
adb logcat -s XStatDiscovery
# Include capped packet-rejection diagnostics:
adb logcat 'XStatDiscovery:D' '*:S'
```

Unit tests cover message validation, bounds and a loopback short-packet followed
by longer-beacon regression. Device tests cover timeout, cancel/restart, search
replacement and first-server-only completion. Run device tests on an isolated
network without another XStat beacon sender. They are not a substitute for
actual Wi-Fi reception, activity lifecycle and reconnection checks.

The app retains minSdk 21, compileSdk/targetSdk 35. Existing INTERNET,
ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE and CHANGE_WIFI_MULTICAST_STATE
permissions are sufficient for the APIs used. The Wi-Fi multicast lock is held
only during discovery. Android documents this lock as disabling Wi-Fi multicast
filtering; it is not a guarantee that every device's broadcast filtering behaves
identically. No location permission, Wi-Fi scan or hotspot API is used.

References:
- https://developer.android.com/reference/android/net/wifi/WifiManager.MulticastLock
- https://developer.android.com/privacy-and-security/local-network-permission

Local-network permission behavior depends on OS version and target SDK. The
new runtime ACCESS_LOCAL_NETWORK requirement applies when targeting API 37+;
this patch does not raise the target SDK. Android 16 opt-in local-network
restrictions need separate testing. No process-wide network binding is added:
Wi-Fi plus mobile data, always-on VPN and Wi-Fi without Internet must be tested
on devices. A VPN routing policy or AP client isolation can still block access.
Background discovery is deliberately cancelled on activity stop; returning to
the foreground starts a fresh search. Health checks also stop in the background.

## Windows

Build with the .NET 9 SDK and run the service from a console to see its logs:

```powershell
dotnet build .\src\XStat.Service\XStat.Service.csproj
dotnet test .\xstat.sln
dotnet run --project .\src\XStat.Service -- --ServicePort=9421 --Logging:LogLevel:XStat.Service.Services.DiscoveryBeaconService=Debug
```

The service requires its normal hardware-driver setup. A successful UDP send
only proves local socket acceptance, not delivery to the phone. Debug logging
shows each send; normal logs show target changes and first failures/recovery.
Beacons start after HTTP startup and advertise the actual HTTP listener port.
Multiple different HTTP listening ports disable discovery with an explicit
warning, because the existing protocol has no endpoint-selection mechanism.

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
    Select-Object InterfaceAlias,IPAddress,PrefixLength
Get-NetConnectionProfile
Get-NetTCPConnection -State Listen -LocalPort 9421
Invoke-WebRequest http://127.0.0.1:9421/health -TimeoutSec 3
# Substitute the PC's actual Ethernet/Wi-Fi address and port:
Test-NetConnection 192.168.1.100 -Port 9421
Invoke-WebRequest http://192.168.1.100:9421/health -TimeoutSec 3
Get-NetFirewallRule -DisplayName '*XStat*' |
    Get-NetFirewallPortFilter
```

The installer currently allows inbound TCP 9421 on the Private profile only.
A custom port needs an appropriately scoped rule. Verify the active profile and
rules; do not disable the firewall. Restrictive outbound policy may also need
an allowance for UDP destination port 47210. Ethernet PC plus Wi-Fi phone works
when the router bridges them into the same broadcast domain. Guest Wi-Fi,
client isolation, VLAN separation and VPN policy may prevent it.

Listen for one beacon (on a second LAN computer when possible):

```powershell
$udp = [Net.Sockets.UdpClient]::new()
try {
    $udp.Client.SetSocketOption([Net.Sockets.SocketOptionLevel]::Socket,
        [Net.Sockets.SocketOptionName]::ReuseAddress, $true)
    $udp.Client.Bind([Net.IPEndPoint]::new([Net.IPAddress]::Any, 47210))
    $udp.Client.ReceiveTimeout = 10000
    $source = [Net.IPEndPoint]::new([Net.IPAddress]::Any, 0)
    $bytes = $udp.Receive([ref]$source)
    '{0}: {1}' -f $source, [Text.Encoding]::ASCII.GetString($bytes)
} finally { $udp.Dispose() }
```

A local listener does not prove delivery on the physical interface. In
Wireshark capture the actual Ethernet/Wi-Fi adapter (and compare virtual
adapters). Capture filter: `udp port 47210`. Display filter:
`udp.dstport == 47210`. For the HTTP stage: `tcp.port == 9421`.

A lightweight simulator, with no hardware service dependency:

```powershell
# Change these values to the sender's LAN address and subnet broadcast address.
$localAddress = '192.168.1.100'
$broadcast = '192.168.1.255'
$udp = [Net.Sockets.UdpClient]::new([Net.IPEndPoint]::new(
    [Net.IPAddress]::Parse($localAddress), 0))
try {
    $udp.EnableBroadcast = $true
    $bytes = [Text.Encoding]::ASCII.GetBytes('XSTAT_HERE:9421')
    1..10 | ForEach-Object {
        [void]$udp.Send($bytes, $bytes.Length, $broadcast, 47210)
        Start-Sleep -Seconds 2
    }
} finally { $udp.Dispose() }
```

This sender tests discovery only: without an HTTP server, subsequent health
checks should fail and trigger rediscovery.

## Distinguishing failures

| Stage | Evidence / next check |
| --- | --- |
| A: No Windows send | Startup/target/send logs and physical-interface capture; verify HTTP started. |
| B: Sent but not received | Physical-interface capture has beacon; Android listening log but no found/rejected packets; check Wi-Fi filtering, AP isolation and VPN. |
| C: Rejected packet | Capped Android debug log includes source and length; inspect payload in capture. |
| D: HTTP unavailable | Found URL followed by HTTP health failure; test that exact URL from phone browser. |
| E: Panel load failure | /health works but main-frame WebView error; check root document/static panel assets and browser console/SignalR. |
| F: Reconnection failure | Check Starting rediscovery, new socket bind, new URL; test background/foreground and port changes. |

Manual acceptance matrix: PC Ethernet + phone Wi-Fi; PC Wi-Fi + phone Wi-Fi;
VMware/Hyper-V/VPN adapters present; non-default HTTP port; no server and retry;
stop/restart service; disable/restore Wi-Fi; background/foreground during search
and panel display; HTTP blocked; missing panel document; multiple servers.
After three failed health checks rediscovery begins (each HTTP timeout can take
several seconds). A discovery timeout shows Try Again. Failed main-frame loads
keep health monitoring alive and retry the document at most once per ten seconds
while HTTP is healthy. Panel JavaScript/SignalR-specific failures still need
browser diagnostics. Manual IP entry is intentionally deferred to a separate PR.
