using Microsoft.AspNetCore.SignalR;

namespace XStat.Service.Hubs;

/// <summary>
/// SignalR hub. Clients subscribe and receive sensor snapshots pushed by SensorBroadcastService.
/// Client JS: const conn = new signalR.HubConnectionBuilder().withUrl("/hubs/sensors").build();
///            conn.on("SensorSnapshot", data => { ... });
/// </summary>
public sealed class SensorHub : Hub
{
    // No server-side methods needed for Phase 1 — push-only model.
    // Later phases will add methods like SubscribeToSensors(string[] ids).
}
