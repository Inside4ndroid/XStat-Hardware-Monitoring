using LibreHardwareMonitor.Hardware;
using XStat.Service.Models;

namespace XStat.Service.Hardware;

/// <summary>
/// Wraps LibreHardwareMonitor. Must run elevated (Administrator) for full sensor access.
/// </summary>
public sealed class HardwareMonitor : IDisposable
{
    private readonly Computer _computer;
    private readonly ILogger<HardwareMonitor> _logger;
    private bool _disposed;

    public HardwareMonitor(ILogger<HardwareMonitor> logger)
    {
        _logger = logger;
        _computer = new Computer
        {
            IsCpuEnabled            = true,
            IsGpuEnabled            = true,
            IsMemoryEnabled         = true,
            IsMotherboardEnabled    = true,
            IsStorageEnabled        = true,
            IsNetworkEnabled        = true,
            IsBatteryEnabled        = true,
            IsControllerEnabled     = true,
            IsPsuEnabled            = true,
        };

        // Log elevation status - LHM uses PawnIO (signed, HVCI-compatible) on 0.9.6+.
        if (OperatingSystem.IsWindows())
        {
            bool isAdmin = new System.Security.Principal.WindowsPrincipal(
                System.Security.Principal.WindowsIdentity.GetCurrent())
                .IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator);

            if (!isAdmin)
                _logger.LogWarning("[XStat] NOT running as Administrator - CPU temperature/clock/power will read 0. Launch via dev-admin.ps1.");
            else
                _logger.LogInformation("[XStat] Running as Administrator.");
        }

        try
        {
            _computer.Open();
            _logger.LogInformation("LibreHardwareMonitor opened successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to open LibreHardwareMonitor. Some sensors may be unavailable.");
        }
    }

    /// <summary>
    /// Polls all hardware sensors and returns a fresh snapshot.
    /// </summary>
    public HardwareSnapshot GetSnapshot()
    {
        var raw = new List<SensorReading>();

        foreach (var hw in _computer.Hardware)
        {
            CollectHardware(hw, raw);
        }

        // Deduplicate: LHM can surface the same sensor via both parent and subhardware
        var seen    = new HashSet<string>(raw.Count);
        var sensors = new List<SensorReading>(raw.Count);
        foreach (var s in raw)
            if (seen.Add(s.Id)) sensors.Add(s);

        return new HardwareSnapshot(
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            sensors);
    }

    /// <summary>
    /// Returns true for virtual / filter-driver network adapters that should be hidden.
    /// LHM exposes every NDIS filter layer as a separate adapter; e.g.:
    ///   "Ethernet-WFP Native MAC Layer LightWeight Filter-0000"
    ///   "Ethernet 2-QoS Packet Scheduler-0000"
    ///   "Local Area Connection* 1"  (virtual hotspot/mobile adapters)
    /// We keep only the real physical or logical NICs.
    /// </summary>
    private static bool IsVirtualNetworkAdapter(string name) =>
        // Filter drivers: end with hyphen-word(s)-four-digits  e.g. "-QoS Packet Scheduler-0000"
        System.Text.RegularExpressions.Regex.IsMatch(name, @"-.+-\d{4}$") ||
        // Windows kernel debugger pseudo-adapter
        name.Contains("Kernel Debugger", StringComparison.OrdinalIgnoreCase) ||
        // Virtual hotspot / mobile broadband adapters
        System.Text.RegularExpressions.Regex.IsMatch(name, @"^Local Area Connection\*");

    private static void CollectHardware(IHardware hw, List<SensorReading> sensors)
    {
        // Skip noise: virtual/filter-layer network adapters
        if (hw.HardwareType == HardwareType.Network && IsVirtualNetworkAdapter(hw.Name))
            return;

        hw.Update();

        foreach (var subHw in hw.SubHardware)
        {
            CollectHardware(subHw, sensors);
        }

        foreach (var sensor in hw.Sensors)
        {
            // Sanitize: LHM returns NaN/Infinity for unavailable sensors; map those to null.
            float? safeValue = sensor.Value is null || float.IsNaN(sensor.Value.Value) || float.IsInfinity(sensor.Value.Value)
                ? null
                : sensor.Value;

            // LHM Throughput sensors emit raw bytes/second.
            // Multiply by 8 and divide by 1,000,000 (i.e. divide by 125,000) to get Mbps.
            float? displayValue = sensor.SensorType == SensorType.Throughput && safeValue.HasValue
                ? safeValue.Value / 125_000f
                : safeValue;

            sensors.Add(new SensorReading(
                Id:           BuildId(hw, sensor),
                Name:         sensor.Name,
                Category:     MapHardwareType(hw.HardwareType),
                Type:         sensor.SensorType.ToString(),
                Value:        displayValue,
                Unit:         MapUnit(sensor.SensorType),
                HardwareName: hw.Name
            ));
        }
    }

    private static string BuildId(IHardware hw, ISensor sensor) =>
        $"{hw.HardwareType}/{hw.Identifier}/{sensor.SensorType}/{sensor.Index}"
            .ToLowerInvariant()
            .Replace(" ", "_");

    private static string MapHardwareType(HardwareType type) => type switch
    {
        HardwareType.Cpu            => "CPU",
        HardwareType.GpuNvidia      => "GPU",
        HardwareType.GpuAmd         => "GPU",
        HardwareType.GpuIntel       => "GPU",
        HardwareType.Memory         => "RAM",
        HardwareType.Motherboard    => "Motherboard",
        HardwareType.SuperIO        => "Motherboard",
        HardwareType.Storage        => "Storage",
        HardwareType.Network        => "Network",
        HardwareType.Battery        => "Battery",
        HardwareType.Psu            => "PSU",
        HardwareType.EmbeddedController => "EC",
        _                           => "Other",
    };

    private static string MapUnit(SensorType type) => type switch
    {
        SensorType.Temperature  => "°C",
        SensorType.Clock        => "MHz",
        SensorType.Load         => "%",
        SensorType.Voltage      => "V",
        SensorType.Power        => "W",
        SensorType.Fan          => "RPM",
        SensorType.Flow         => "L/h",
        SensorType.Control      => "%",
        SensorType.Level        => "%",
        SensorType.Factor       => "×",
        SensorType.Data         => "GB",
        SensorType.SmallData    => "MB",
        SensorType.Throughput   => "Mbps",
        SensorType.TimeSpan     => "s",
        SensorType.Energy       => "mWh",
        SensorType.Noise        => "dBA",
        SensorType.Humidity     => "%",
        _                       => "",
    };

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        try { _computer.Close(); } catch { /* best effort */ }
    }
}
