using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using XStat.Service.Hubs;
using XStat.Service.Services;

namespace XStat.Service.Controllers;

[ApiController]
[Route("api/panel-layout")]
public sealed class PanelLayoutController : ControllerBase
{
    private readonly PanelLayoutStore   _store;
    private readonly IHubContext<SensorHub> _hub;

    public PanelLayoutController(PanelLayoutStore store, IHubContext<SensorHub> hub)
    {
        _store = store;
        _hub   = hub;
    }

    /// <summary>
    /// GET /api/panel-layout — returns the current layout JSON, or 204 when none has been pushed yet.
    /// </summary>
    [HttpGet]
    public IActionResult Get()
    {
        var json = _store.GetLayoutJson();
        if (json is null) return NoContent();
        return Content(json, "application/json");
    }

    /// <summary>
    /// PUT /api/panel-layout — stores the layout and pushes a LayoutUpdated event to all
    /// connected SignalR clients so the LAN panel refreshes immediately.
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> Put([FromBody] JsonElement body)
    {
        var json = body.GetRawText();
        _store.SetLayoutJson(json);
        await _hub.Clients.All.SendAsync("LayoutUpdated", json);
        return NoContent();
    }
}
