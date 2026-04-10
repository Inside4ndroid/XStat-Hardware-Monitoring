using Microsoft.AspNetCore.Mvc;
using XStat.Service.Models;
using XStat.Service.Services;

namespace XStat.Service.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SensorsController : ControllerBase
{
    private readonly SensorBroadcastService _broadcast;

    public SensorsController(SensorBroadcastService broadcast)
    {
        _broadcast = broadcast;
    }

    /// <summary>GET /api/sensors — returns the most recent sensor snapshot.</summary>
    [HttpGet]
    public ActionResult<HardwareSnapshot> GetLatest()
    {
        var snapshot = _broadcast.LastSnapshot;
        if (snapshot is null)
            return StatusCode(503, new { error = "Sensor data not yet available." });

        return Ok(snapshot);
    }

    /// <summary>GET /api/sensors/{category} — filter by category (CPU, GPU, RAM …)</summary>
    [HttpGet("{category}")]
    public ActionResult<HardwareSnapshot> GetByCategory(string category)
    {
        var snapshot = _broadcast.LastSnapshot;
        if (snapshot is null)
            return StatusCode(503, new { error = "Sensor data not yet available." });

        var filtered = snapshot.Sensors
            .Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .ToList();

        return Ok(new HardwareSnapshot(snapshot.TimestampMs, filtered));
    }
}
