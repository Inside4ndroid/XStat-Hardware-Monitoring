using Microsoft.AspNetCore.SignalR;
using XStat.Service.Hardware;
using XStat.Service.Hubs;
using XStat.Service.Models;

namespace XStat.Service.Services;

/// <summary>
/// Background service that polls LibreHardwareMonitor on a fixed interval
/// and broadcasts the snapshot to all connected SignalR clients.
/// </summary>
public sealed class SensorBroadcastService : BackgroundService
{
    private readonly HardwareMonitor _monitor;
    private readonly IHubContext<SensorHub> _hubContext;
    private readonly ILogger<SensorBroadcastService> _logger;

    // Cached last snapshot for REST clients that request /api/sensors without waiting.
    private HardwareSnapshot? _lastSnapshot;
    public HardwareSnapshot? LastSnapshot => _lastSnapshot;

    // Poll interval — mutable at runtime so the Settings page can change it live.
    private volatile int _pollIntervalMs;
    public int PollIntervalMs
    {
        get => _pollIntervalMs;
        set => _pollIntervalMs = Math.Clamp(value, 100, 30_000);
    }

    public SensorBroadcastService(
        HardwareMonitor monitor,
        IHubContext<SensorHub> hubContext,
        ILogger<SensorBroadcastService> logger,
        IConfiguration config)
    {
        _monitor = monitor;
        _hubContext = hubContext;
        _logger = logger;
        _pollIntervalMs = config.GetValue<int>("SensorPollIntervalMs", 1000);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SensorBroadcastService started. Poll interval: {Interval}ms",
            _pollIntervalMs);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var snapshot = _monitor.GetSnapshot();
                _lastSnapshot = snapshot;

                await _hubContext.Clients.All.SendAsync("SensorSnapshot", snapshot, stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Error collecting/broadcasting sensor data.");
            }

            await Task.Delay(_pollIntervalMs, stoppingToken).ConfigureAwait(false);
        }
    }
}
