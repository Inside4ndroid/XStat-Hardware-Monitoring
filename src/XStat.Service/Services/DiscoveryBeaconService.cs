using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

namespace XStat.Service.Services;

/// <summary>Announces the listening HTTP port on each active IPv4 subnet every two seconds.</summary>
public sealed class DiscoveryBeaconService(
    IServer server,
    IHostApplicationLifetime lifetime,
    ILogger<DiscoveryBeaconService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var ready = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var registration = lifetime.ApplicationStarted.Register(() => ready.TrySetResult());
        await ready.Task.WaitAsync(stoppingToken);

        var addresses = server.Features.Get<IServerAddressesFeature>()?.Addresses;
        var ports = addresses?.Select(address => new Uri(address))
            .Where(uri => uri.Scheme == "http" && uri.Port is > 0 and <= 65535)
            .Select(uri => uri.Port).Distinct().ToArray() ?? [];
        if (ports.Length != 1)
        {
            logger.LogWarning("Discovery disabled: expected one listening HTTP port, found {Count}", ports.Length);
            return;
        }

        var payload = Encoding.ASCII.GetBytes($"XSTAT_HERE:{ports[0]}");
        string? previousTargets = null;
        var failed = new HashSet<string>();
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Refresh addresses so adapter changes do not require a service restart.
                var targets = NetworkInterface.GetAllNetworkInterfaces()
                    .Where(nic => nic.OperationalStatus == OperationalStatus.Up &&
                        nic.NetworkInterfaceType is not NetworkInterfaceType.Loopback and not NetworkInterfaceType.Tunnel)
                    .SelectMany(nic => nic.GetIPProperties().UnicastAddresses)
                    .Where(address => address.Address.AddressFamily == AddressFamily.InterNetwork &&
                        address.PrefixLength is > 0 and < 31)
                    .Select(address => (Local: address.Address, Broadcast: BroadcastAddress(address.Address, address.IPv4Mask)))
                    .Distinct().ToArray();
                var description = string.Join(", ", targets.Select(t => $"{t.Local}->{t.Broadcast}:47210").Order());
                if (description != previousTargets)
                {
                    logger.LogInformation("Discovery HTTP port {Port}; UDP targets: {Targets}", ports[0], description);
                    previousTargets = description;
                }
                foreach (var target in targets)
                {
                    var key = target.Local.ToString();
                    try
                    {
                        using var udp = new UdpClient(new IPEndPoint(target.Local, 0));
                        udp.EnableBroadcast = true;
                        await udp.SendAsync(payload.AsMemory(), new IPEndPoint(target.Broadcast, 47210), stoppingToken);
                        logger.LogDebug("Discovery beacon sent from {Local} to {Broadcast}:47210", target.Local, target.Broadcast);
                        if (failed.Remove(key)) logger.LogInformation("Discovery send recovered on {Local}", target.Local);
                    }
                    catch (SocketException ex)
                    {
                        if (failed.Add(key)) logger.LogWarning(ex, "Discovery send failed on {Local}; retrying", target.Local);
                    }
                }
            }
            catch (NetworkInformationException ex)
            {
                if (failed.Add("interfaces")) logger.LogWarning(ex, "Discovery interface enumeration failed; retrying");
            }
            await Task.Delay(2000, stoppingToken);
        }
    }

    internal static IPAddress BroadcastAddress(IPAddress address, IPAddress mask)
    {
        var bytes = address.GetAddressBytes();
        var maskBytes = mask.GetAddressBytes();
        for (var i = 0; i < bytes.Length; i++) bytes[i] |= (byte)~maskBytes[i];
        return new IPAddress(bytes);
    }
}
