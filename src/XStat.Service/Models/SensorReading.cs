namespace XStat.Service.Models;

public record SensorReading(
    string Id,          // Unique path: e.g. "/lpc/nct6791d/temperature/0"
    string Name,        // Display name: "CPU Package"
    string Category,    // "CPU" | "GPU" | "RAM" | "Storage" | "Motherboard" | "Network" | "Battery" | "PSU"
    string Type,        // "Temperature" | "Clock" | "Load" | "Voltage" | "Power" | "Fan" | "Flow" | "Data" | "Throughput"
    float? Value,       // Current value (null if unavailable)
    string Unit,        // "°C" | "MHz" | "%" | "V" | "W" | "RPM" | "L/h" | "GB" | "MB/s"
    string HardwareName // "AMD Ryzen 9 7950X" etc.
);

public record HardwareSnapshot(
    long TimestampMs,               // Unix epoch ms
    IReadOnlyList<SensorReading> Sensors
);
