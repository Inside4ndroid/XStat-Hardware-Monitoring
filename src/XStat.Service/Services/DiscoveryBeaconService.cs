using System.Net;
using System.Net.Sockets;
using System.Text;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace XStat.Service.Services;

/// <summary>
/// Broadcasts a UDP beacon on all local network interfaces so Android
/// companion apps can discover XStat without any manual IP configuration.
///
/// The beacon payload is the ASCII string:  XSTAT_HERE:{port}
/// Broadcast address: 255.255.255.255, UDP port 47210.
/// Interval: every 2 seconds while the service is running.
/// </summary>
public sealed class DiscoveryBeaconService : BackgroundService
{
    private const int BeaconPort = 47210;
    private const int IntervalMs = 2000;

    private readonly int _servicePort;
    private readonly ILogger<DiscoveryBeaconService> _logger;

    public DiscoveryBeaconService(IConfiguration config, ILogger<DiscoveryBeaconService> logger)
    {
        _servicePort = config.GetValue<int>("ServicePort", 9421);
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var payload = Encoding.ASCII.GetBytes($"XSTAT_HERE:{_servicePort}");
        var target  = new IPEndPoint(IPAddress.Broadcast, BeaconPort);

        _logger.LogInformation(
            "DiscoveryBeaconService: broadcasting XSTAT_HERE:{Port} on UDP {BeaconPort} every {Interval}ms",
            _servicePort, BeaconPort, IntervalMs);

        using var udp = new UdpClient();
        udp.EnableBroadcast = true;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await udp.SendAsync(payload, payload.Length, target);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "DiscoveryBeaconService: send failed, will retry");
            }

            await Task.Delay(IntervalMs, stoppingToken);
        }
    }
}
